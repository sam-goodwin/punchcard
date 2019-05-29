import AWS = require('aws-sdk');

import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');
import { ENTRYPOINT_SYMBOL_NAME, isRuntime, RUNTIME_ENV, WEBPACK_MODE } from '../../constants';
import { Json, Mapper, Raw, Type } from '../../shape';
import { Omit } from '../../utils';

import fs = require('fs');
import path = require('path');
import { Client, Dependency } from '../dependency';
import { Cache, PropertyBag } from '../property-bag';
import { Entrypoint, entrypoint, Runtime } from '../runtime';

export type FunctionProps<T, U, D extends Dependency<any>> = {
  /**
   * Type of the request
   *
   * @default any
   */
  request?: Type<T>;

  /**
   * Type of the response
   *
   * @default any
   */
  response?: Type<U>;

  /**
   * Dependency resources which this Function needs clients for.
   *
   * Each client will have a chance to grant permissions to the function and environment variables.
   */
  depends?: D;

  /**
   * Function to handle the event of type `T`, given initialized client instances `Clients<C>`.
   */
  handle: (event: T, run: Client<D>, context: any) => Promise<U>;
} & Omit<lambda.FunctionProps, 'runtime' | 'code' | 'handler'>;

/**
 * Runs a function `T => U` in AWS Lambda with some runtime dependencies, `D`.
 *
 * @typeparam T input type
 * @typeparam U return type
 * @typeparam D runtime dependencies
 */
export class Function<T, U, D extends Dependency<any>>
    extends lambda.Function
    implements Entrypoint, Dependency<Function.Client<T, U>> {
  public readonly [entrypoint] = true;
  public readonly filePath: string;

  /**
   * Function to handle the event of type `T`, given initialized client instances `Clients<C>`.
   *
   * @param event the parsed request
   * @param clients initialized clients to dependency resources
   */
  public readonly handle: (event: T, clients: Client<D>, context: any) => Promise<U>;

  private readonly request?: Type<T>;
  private readonly response?: Type<U>;
  private readonly dependencies?: D;

  constructor(scope: cdk.Construct, id: string, props: FunctionProps<T, U, D>) {
    super(scope, id, {
      ...props,
      code: code(scope),
      runtime: new lambda.Runtime('nodejs10.x', lambda.RuntimeFamily.NodeJS, {supportsInlineCode: true}),
      handler: 'index.handler'
    });

    this.handle = props.handle;

    this.request = props.request;
    this.response = props.response;
    this.dependencies = props.depends;

    const properties = new PropertyBag(this.node.uniqueId, {});
    if (this.dependencies) {
      this.dependencies.install(new Runtime(properties, this));
    }
    for (const [name, p] of Object.entries(properties.properties)) {
      this.addEnvironment(name, p);
    }
    this.addEnvironment(RUNTIME_ENV, this.node.path);
  }

  public async boot(): Promise<(event: any, context: any) => Promise<U>> {
    const bag: {[name: string]: string} = {};
    for (const [env, value] of Object.entries(process.env)) {
      if (env.startsWith(this.node.uniqueId) && value !== undefined) {
        bag[env] = value;
      }
    }
    let client: Client<D> = undefined as any;

    if (this.dependencies) {
      const cache = new Cache();
      const runtimeProperties = new PropertyBag(this.node.uniqueId, bag);
      client = this.dependencies.bootstrap(runtimeProperties, cache);
    }
    const requestMapper: Mapper<T, any> = this.request === undefined ? Raw.passthrough() : Raw.forType(this.request);
    const responseMapper: Mapper<U, any> = this.response === undefined ? Raw.passthrough() : Raw.forType(this.response);
    return (async (event: any, context) => {
      const parsed = requestMapper.read(event);
      try {
        const result = await this.handle(parsed, client, context);
        return responseMapper.write(result);
      } catch (err) {
        console.error(err);
        throw err;
      }
    });
  }

  /**
   * Install this Function in another `Runtime`, creating a client to invoke this Function.
   *
   * @param target runtime
   */
  public install(target: Runtime): void {
    this.grantInvoke(target.grantable);
    target.properties.set('functionArn', this.functionArn);
  }

  /**
   * Create a client to invoke this function.
   *
   * @param properties property bag containing variables set during the `install` phase
   * @param cache global cache shared by the runtime
   */
  public bootstrap(properties: PropertyBag, cache: Cache): Function.Client<T, U> {
    const requestMapper: Mapper<T, string> = this.request === undefined ? Json.forAny() : Json.forType(this.request);
    const responseMapper: Mapper<U, string> = this.response === undefined ? Json.forAny() : Json.forType(this.response);
    return new Function.Client(
      cache.getOrCreate('aws:lambda', () => new AWS.Lambda()),
      properties.get('functionArn'),
      requestMapper,
      responseMapper
    );
  }
}

export namespace Function {
  /**
   * Client for invoking a Lambda Function
   */
  export class Client<T, U> {
    constructor(
      private readonly client: AWS.Lambda,
      private readonly functionArn: string,
      private readonly requestMapper: Mapper<T, string>,
      private readonly responseMapper: Mapper<U, string>) {}

    /**
     * Invoke the function synchronously and return the result.
     * @return Promise of the result
     */
    public async invoke(request: T): Promise<U> {
      const response = await this.client.invoke({
        FunctionName: this.functionArn,
        InvocationType: 'RequestResponse',
        Payload: this.requestMapper.write(request)
      }).promise();

      if (response.StatusCode === 200) {
        if (typeof response.Payload === 'string') {
          return this.responseMapper.read(response.Payload);
        } else {
          if (Buffer.isBuffer(response.Payload)) {
            return this.responseMapper.read(response.Payload.toString('utf8'));
          } else {
            throw new Error(`Unknown response payload type: ${typeof response.Payload}`);
          }
        }
      } else {
        throw new Error(`Function returned non-200 status code, '${response.StatusCode}' with error, '${response.FunctionError}'`);
      }
    }

    /**
     * Invoke the function asynchronously.
     */
    public async invokeAsync(request: T): Promise<void> {
      await this.client.invoke({
        FunctionName: this.functionArn,
        InvocationType: 'Event',
        Payload: this.requestMapper.write(request)
      }).promise();
    }
  }
}

function findApp(c: cdk.IConstruct): cdk.App {
  while (c.node.scope !== undefined) {
    c = c.node.scope;
  }
  return c as cdk.App;
}

const codeSymbol = Symbol.for('punchcard:code');
export function code(scope: cdk.IConstruct): lambda.Code {
  if (isRuntime()) {
    class MockCode extends lambda.Code {
      public readonly isInline: boolean = false;
      public _toJSON(_resource?: cdk.CfnResource): lambda.CfnFunction.CodeProperty {
        return {};
      }
    }
    return new MockCode();
  }

  const app = findApp(scope);
  if ((app as any)[codeSymbol] === undefined) {
    const index = process.mainModule!.filename;
    const dist = path.resolve(path.dirname(index), '.punchcard');
    const name = path.basename(index, '.js');
    const codePath = path.join(dist, name);
    // HACK: this block is effectively erased at runtime:
    // 1) it is guarded by an environment variable expected to only be set at runtime
    // 2) webpack removes calls to itself, i.e. require('webpack')
    if (!fs.existsSync(dist)) {
      fs.mkdirSync(dist);
    }
    if (!fs.existsSync(codePath)) {
      fs.mkdirSync(codePath);
    }

    const webpack = require('webpack');
    const compiler = webpack({
      mode: scope.node.getContext(WEBPACK_MODE) || 'production',
      entry: index,
      target: 'node',
      output: {
        path: codePath,
        filename: 'app.js',
        libraryTarget: 'umd',
      },
      externals: ['aws-sdk', 'webpack'],
      plugins: [new webpack.IgnorePlugin({
        resourceRegExp: /^webpack$/ // don't generate imports for webpack
      })]
    });
    compiler.run((err: Error) => {
      if (err) {
        console.log(err);
      }
    });
    fs.writeFileSync(path.join(codePath, 'index.js'), `
const app = require('./app').default;

if (app === undefined) {
  throw new Error('app is null, are you exporting your cdk.App as the default in your main module (i.e. index.js)?');
}

app.run = (() => {
  // no-op when at runtime
  console.log('cdk.App.run: no-op');
  return null;
});

var handler;
exports.handler = async (event, context) => {
  if (!handler) {
    const runPath = process.env['${RUNTIME_ENV}'];
    const target = app.node.findChild(runPath);
    if (target[Symbol.for('${ENTRYPOINT_SYMBOL_NAME}')] === true) {
      handler = await target.boot();
    } else {
      throw new Error(\`path '\${runPath}' did not point to an Entrypoint\`);
    }
  }
  return await handler(event, context);
};
`);
    (app as any)[codeSymbol] = lambda.Code.asset(codePath);
  }

  return (app as any)[codeSymbol] as lambda.Code;
}
