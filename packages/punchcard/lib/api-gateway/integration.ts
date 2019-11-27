import api = require('@aws-cdk/aws-apigateway');

import { Build } from '../core/build';
import { Dependency } from '../core/dependency';
import { Resource as RResource } from '../core/resource';
import * as Lambda from '../lambda';
import { Omit } from '../util/omit';
import { Resource } from './resource';

type ResourceMappings = {[key: string]: Resource};

export interface Integration<_R extends Dependency<any>> extends RResource<api.LambdaIntegration> {
  mapResource(resource: Resource): void;
  findResource(resourceId: string): Resource;
}

const resourceIdPrefix = 'resource_id_';
export class LambdaIntegration<R extends Dependency<any>> implements Integration<R> {
  public readonly resource: Build<api.LambdaIntegration>;

  private readonly resourceMappings: {[key: string]: Resource} = {};
  private index: ResourceMappings;

  constructor(private readonly fn: Lambda.Function<any, any, R>, options?: Build<Omit<api.LambdaIntegrationOptions, 'proxy'>>) {
    options = options || Build.of({});

    this.resource = fn.resource.chain(f => options!.map(options => new api.LambdaIntegration(f, {
      ...options,
      proxy: false
    })));
  }

  public mapResource(resource: Resource) {
    return Build
      .concat(this.fn.resource, resource.resource)
      .map(([fn, r]) => {
        // TODO: namespace _resource_ consistently with other bootstraps

        fn.addEnvironment(`${resourceIdPrefix}${r.node.uniqueId}`, r.resourceId);
        this.resourceMappings[r.node.uniqueId] = resource; // TODO: mutability here seems bad
      });
  }

  public findResource(resourceId: string): Resource {
    if (!this.index) {
      this.index = {};
      Object.keys(process.env).forEach(name => {
        if (name.startsWith(resourceIdPrefix)) {
          const resourceId = process.env[name];
          if (resourceId === undefined) {
            throw new Error(`no environment variable, '${name}'`);
          }
          const uniqueId = name.substring(resourceIdPrefix.length);

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
