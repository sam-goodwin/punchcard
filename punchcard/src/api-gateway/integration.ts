import * as Lambda from "../lambda";
import * as apigateway from "@aws-cdk/aws-apigateway";
import {Build} from "../core/build";
import {CDK} from "../core/cdk";
import {Dependency} from "../core/dependency";
import {Resource as RResource} from "../core/resource";
import {Resource} from "./resource";
import {TreeFields} from "../util";

type ResourceMappings = {[key: string]: Resource};

export interface Integration<_R extends Dependency<any>>
  extends RResource<apigateway.LambdaIntegration> {
  findResource(resourceId: string): Resource;
  mapResource(resource: Resource): void;
}

const resourceIdPrefix = "resource_id_";
export class LambdaIntegration<R extends Dependency<any>>
  implements Integration<R> {
  public readonly resource: Build<apigateway.LambdaIntegration>;

  private readonly resourceMappings: {[key: string]: Resource} = {};
  private index: ResourceMappings;

  constructor(
    private readonly fn: Lambda.Function<any, any, R>,
    options?: Build<Omit<apigateway.LambdaIntegrationOptions, "proxy">>,
  ) {
    options = options || Build.of({});

    this.resource = CDK.chain(({apigateway}) =>
      fn.resource.chain((f) =>
        options!.map(
          (options) =>
            new apigateway.LambdaIntegration(f, {
              ...options,
              proxy: false,
            }),
        ),
      ),
    );
  }

  public mapResource(resource: Resource): Build<void> {
    const id = resource[TreeFields.path].replace(/\W/g, "_");
    this.resourceMappings[id] = resource; // TODO: mutability here seems bad

    return Build.concat(this.fn.resource, resource.resource).map(([fn, r]) => {
      // TODO: namespace _resource_ consistently with other bootstraps
      fn.addEnvironment(`${resourceIdPrefix}${id}`, r.resourceId);
    });
  }

  public findResource(resourceId: string): Resource {
    if (!this.index) {
      this.index = {};
      Object.keys(process.env).forEach((name) => {
        if (name.startsWith(resourceIdPrefix)) {
          const resourceId = process.env[name];
          if (resourceId === undefined) {
            throw new Error(`no environment variable, '${name}'`);
          }
          const uniqueId = name.slice(resourceIdPrefix.length);
          this.index[resourceId] = this.resourceMappings[uniqueId];
        }
      });
    }
    const resource = this.index[resourceId];
    if (!resource) {
      throw new Error(`could not find resource for resource id: ${resourceId}`);
    }
    return resource;
  }
}
