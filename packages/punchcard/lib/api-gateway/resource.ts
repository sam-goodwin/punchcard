import apigateway = require('@aws-cdk/aws-apigateway');
import cdk = require('@aws-cdk/core');

import { Dependency } from '../compute/dependency';
import { isRuntime } from '../constants';
import { jsonSchema, Kind, Mapper, Raw, Shape, StructType, Type } from '../shape';
import { Tree } from '../tree';
import { Method, MethodName, RequestMappings, Response, Responses } from './method';
import { StatusCode } from './request-response';
import { $context, isMapping, Mapping, TypedMapping } from './variable';

type ResponseMappers = {
  [status in StatusCode]: Mapper<any, string>;
};
interface Handler<T> {
  requestMapper: Mapper<T, string>;
  handler: (request: T, context: any) => Promise<Response<any, any>>;
  responseMappers: ResponseMappers;
}
type MethodHandlers = { [method: string]: Handler<any>; };

export class Resource extends Tree<Resource> {
  public readonly resource: apigateway.Resource;

  protected readonly restApiId: string;
  protected readonly getRequestValidator: apigateway.CfnRequestValidator;
  protected readonly bodyRequestValidator: apigateway.CfnRequestValidator;

  private readonly methods: MethodHandlers;

  constructor(parent: Resource, pathPart: string, options: apigateway.ResourceOptions) {
    super(parent, pathPart);
    this.methods = {};

    if (parent) {
      this.restApiId = parent.restApiId;
      this.resource = parent.resource.addResource(pathPart, options);
      this.getRequestValidator = parent.getRequestValidator;
      this.bodyRequestValidator = parent.bodyRequestValidator;
    }
  }

  public async handle(event: any, context: any): Promise<any> {
    console.log('resource handle', event);
    const upperHttpMethod = event.__httpMethod.toUpperCase();
    const handler = this.methods[upperHttpMethod];
    if (handler) {
      const request = handler.requestMapper.read(event);
      let result: Response<any, any>;
      let responseMapper: Mapper<any, any>;
      try {
        result = await handler.handler(request, context);
        responseMapper = (handler.responseMappers as any)[result.statusCode];
      } catch (err) {
        console.error('api gateway handler threw error', err.message);
        throw err;
      }
      if (responseMapper === undefined) {
        throw new Error(`unexpected status code: ${result.statusCode}`);
      }
      try {
        const payload = responseMapper.write(result.payload);
        if (result.statusCode === StatusCode.Ok) {
          return payload;
        } else {
          throw new Error(JSON.stringify({
            statusCode: result.statusCode,
            body: payload
          }));
        }
      } catch (err) {
        console.error('failed to serialize payload', err);
        throw err;
      }
    } else {
      throw new Error(`No handler for http method: ${event.httpMethod}`);
    }
  }

  public setDeleteMethod<R extends Dependency<any>, T extends Shape, U extends Responses>(method: Method<R, T, U, 'DELETE'>) {
    this.addMethod('DELETE', method);
  }

  public setGetMethod<R extends Dependency<any>, T extends Shape, U extends Responses>(method: Method<R, T, U, 'GET'>) {
    this.addMethod('GET', method);
  }

  public setHeadMethod<R extends Dependency<any>, T extends Shape, U extends Responses>(method: Method<R, T, U, 'HEAD'>) {
    this.addMethod('HEAD', method);
  }

  public setOptionsMethod<R extends Dependency<any>, T extends Shape, U extends Responses>(method: Method<R, T, U, 'OPTIONS'>) {
    this.addMethod('OPTIONS', method);
  }

  public setPatchMethod<R extends Dependency<any>, T extends Shape, U extends Responses>(method: Method<R, T, U, 'PATCH'>) {
    this.addMethod('PATCH', method);
  }

  public setPostMethod<R extends Dependency<any>, T extends Shape, U extends Responses>(method: Method<R, T, U, 'POST'>) {
    this.addMethod('POST', method);
  }

  public setPutMethod<R extends Dependency<any>, T extends Shape, U extends Responses>(method: Method<R, T, U, 'PUT'>) {
    this.addMethod('PUT', method);
  }

  public addResource(pathPart: string, options: apigateway.ResourceOptions = {}): Resource {
    return new Resource(this, pathPart, options);
  }

  private addMethod<R extends Dependency<any>, T extends Shape, U extends Responses, M extends MethodName>(methodName: M, method: Method<R, T, U, M>) {
    this.makeHandler(methodName, method as any);
    if (isRuntime()) {
      // don't do expensive work at runtime
      return;
    }

    const methodResource = this.resource.addMethod(methodName, method.integration);
    const cfnMethod = methodResource.node.findChild('Resource') as apigateway.CfnMethod;

    const requestShape = method.request.shape;
    cfnMethod.addPropertyOverride('Integration', {
      passthroughBehavior: 'NEVER',
      requestTemplates: {
        'application/json': velocityTemplate(requestShape, {
          ...method.request.mappings as object,
          __resourceId: $context.resourceId,
          __httpMethod: $context.httpMethod
        })
      },
      integrationResponses: Object.keys(method.responses).map(statusCode => {
        if (statusCode.toString() === StatusCode.Ok.toString()) {
          return {
            statusCode,
            selectionPattern: ''
          };
        } else {
          return {
            statusCode,
            selectionPattern: `\\{"statusCode":${statusCode}.*`,
            responseTemplates: {
              'application/json': velocityTemplate(
                (method.responses as any)[statusCode] as any, {},
                "$util.parseJson($input.path('$.errorMessage')).body")
            }
          };
        }
      })
    });

    if (methodName === 'GET') {
      cfnMethod.addPropertyOverride('RequestValidatorId', this.getRequestValidator.ref);
    } else {
      cfnMethod.addPropertyOverride('RequestValidatorId', this.bodyRequestValidator.ref);
    }
    cfnMethod.addPropertyOverride('RequestModels', {
      'application/json': new apigateway.CfnModel(methodResource, 'Request', {
        restApiId: this.restApiId,
        contentType: 'application/json',
        schema: jsonSchema(requestShape)
      }).ref
    });
    const responses = new cdk.Construct(methodResource, 'Response');
    cfnMethod.addPropertyOverride('MethodResponses', Object.keys(method.responses).map(statusCode => {
      return {
        statusCode,
        responseModels: {
          'application/json': new apigateway.CfnModel(responses, statusCode, {
            restApiId: this.restApiId,
            contentType: 'application/json',
            schema: (method.responses as {[key: string]: Type<any>})[statusCode].toJsonSchema()
          }).ref
        },
        // TODO: responseParameters
      };
    }));
  }

  private makeHandler(httpMethod: string, method: Method<any, any, any, any>): void {
    method.integration.mapResource(this);
    const responseMappers: ResponseMappers = {} as ResponseMappers;
    Object.keys(method.responses).forEach(statusCode => {
      // TODO: can we return raw here?
      (responseMappers as any)[statusCode] = Raw.forType(method.responses[statusCode]);
    });
    this.methods[httpMethod.toUpperCase()] = {
      handler: method.handle,
      requestMapper: Raw.forShape(method.request.shape),
      responseMappers
    };
  }
}

function velocityTemplate<S extends Shape>(
    shape: Shape,
    mappings?: RequestMappings<S, any>,
    root: string = "$input.path('$')"): string {

  let template = `#set($inputRoot = ${root})\n`;
  template += '{\n';

  function walk(shape: Shape, name: string, mapping: TypedMapping<any> | object, depth: number) {
    template += '  '.repeat(depth);
    if (mapping) {
      if ((mapping as any)[isMapping]) {
        template += `"${name}": ${(mapping as Mapping).path}`;
      } else if (typeof mapping === 'object') {
        template += `"${name}": {\n`;
        Object.keys(mapping).forEach((childName, i) => {
          const childShape = (shape[childName] as StructType<any>).shape;
          walk(childShape, childName, (mapping as any)[childName], depth + 1);
          if (i + 1 < Object.keys(mapping).length) {
            template += ',\n';
          } else {
            template += `\n${'  '.repeat(depth)}}`;
          }
        });
      } else {
        throw new Error(`unexpected type when generating velocity template: ${typeof mapping}`);
      }
    } else {
      const type = shape[name];
      let path: string;
      if (type.kind === Kind.String || type.kind === Kind.Timestamp || type.kind === Kind.Binary) {
        path = `"$inputRoot.${name}"`;
      } else {
        path = `$inputRoot.${name}`;
      }
      // #if ((! $car.fuel) && ("$!car.fuel" == ""))
      template += `"${name}":${path}`;
    }
  }

  let i = 0;
  const keys = new Set(Object.keys(shape).concat(Object.keys(mappings || {})));
  for (const childName of keys) {
    walk(shape, childName, (mappings as any)[childName], 1);
    if (i + 1 < keys.size) {
      template += ',';
    }
    template += '\n';
    i += 1;
  }
  template += '}\n';
  return template;
}

// class VelocityTemplate<S extends Shape> {
//   constructor(shape: S, mappings: RequestMappings<S, any> = {}, root: string = "$input.path('$')") {
//     function walk(type: Type<any>): Renderer {
//       switch (type.kind) {
//         case Kind.Binary:
//         case Kind.String:
//         case Kind.Timestamp:

//       }
//     }

//     for (const [name, schema] of Object.entries(shape)) {
//       switch (schema.kind) {
//         case Kind.Binary:
//         case Kind.String:
//         case Kind.Timestamp:

//       }
//     }
//   }
// }

// interface Renderer {
//   render(generator: Generator): void;
// }

// class Value implements Renderer {
//   constructor(private readonly value: string) {}
//   public render(generator: Generator): void {
//     generator.write(this.value);
//   }
// }
// class Quote implements Renderer {
//   constructor(private readonly delegate: Renderer) {}
//   public render(generator: Generator): void {
//     generator.write('"');
//     this.delegate.render(generator);
//     generator.write('"');
//   }
// }
// class Property implements Renderer {
//   constructor(
//     private readonly property: string,
//     private readonly name: string,
//     private readonly value: Renderer) {}

//   public render(generator: Generator): void {
//     generator.line(`#if ((! ${this.property}) && ("$!${this.property}" == "")`);
//     generator.write(`"${this.name}:`);
//     this.value.render(generator);
//     generator.line('');
//     generator.line('#else');
//     generator.line(`"${this.name}":null`);
//     generator.line('#end');
//   }
// }
// class Csv implements Renderer {
//   constructor(private readonly items: Renderer[]) {}
//   public render(generator: Generator): void {
//     for (let i = 0; i < this.items.length; i++) {
//       this.items[i].render(generator);
//       if (i + 1 === this.items.length) {
//         generator.write(',');
//       }
//     }
//   }
// }
// class JsonObject implements Renderer {
//   private readonly csv: Csv;
//   constructor(properties: Property[]) {
//     this.csv = new Csv(properties);
//   }
//   public render(generator: Generator): void {
//     generator.line('{').indent();
//     this.csv.render(generator);
//     generator.line('}').unindent();
//   }
// }

// class StringBuilder {
//   private readonly items: string[] = [];

//   public append(str: string): void {
//     this.items.push(str);
//   }

//   public get stringValue(): string {
//     return this.items.join('');
//   }
// }

// class Generator {
//   private indented: boolean = false;
//   private depth: number = 0;
//   private readonly template: StringBuilder = new StringBuilder();

//   public set(variable: string, value: string): Generator {
//     return this.line(`#set ($${variable} = ${value})`);
//   }

//   public indent(): Generator {
//     this.depth += 1;
//     return this;
//   }

//   public unindent(): Generator {
//     this.depth -= 1;
//     if (this.depth < 0) {
//       throw new Error(`indent underflow`);
//     }
//     return this;
//   }

//   public line(line: string): Generator {
//     this.write(line + '\n');
//     this.indented = false;
//     return this;
//   }

//   public write(content: string): Generator {
//     if (!this.indented) {
//       this.template.append('  '.repeat(this.depth));
//       this.indented = true;
//     }
//     this.template.append(content);
//     return this;
//   }

//   public render(): string {
//     return this.template.stringValue;
//   }
// }
