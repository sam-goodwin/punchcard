import api = require('@aws-cdk/aws-apigateway');

import { Function } from '../lambda';
import { ClientContext } from '../runtime';
import { Omit } from '../utils';
import { Resource } from './resource';

type ResourceMappings = {[key: string]: Resource};

export interface Integration<_R extends ClientContext> extends api.LambdaIntegration {
  mapResource(resource: Resource): void;
  findResource(resourceId: string): Resource;
}

const resourceIdPrefix = 'resource_id_';
export class LambdaIntegration<R extends ClientContext> extends api.LambdaIntegration implements Integration<R> {
  private readonly resourceMappings: {[key: string]: Resource} = {};
  private index: ResourceMappings;

  constructor(private readonly fn: Function<any, any, R>, options?: Omit<api.LambdaIntegrationOptions, 'proxy'>) {
    super(fn, {
      ...(options || {}),
      proxy: false
    });
  }

  public mapResource(resource: Resource) {
    // TODO: namespace _resource_ consistently with other bootstraps
    this.fn.addEnvironment(`${resourceIdPrefix}${resource.resource.node.uniqueId}`, resource.resource.resourceId);
    this.resourceMappings[resource.resource.node.uniqueId] = resource;
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
