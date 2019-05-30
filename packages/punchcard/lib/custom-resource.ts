import cdk = require('@aws-cdk/cdk');

import { RuntimeShape, RuntimeType, Type } from "./shape";
import { Omit } from "./utils";

// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requests.html

export type ResourceProperties = {
  [key: string]: Type<string | number | boolean>;
};

export class CustomResource<P extends ResourceProperties> extends cdk.Construct {
  public readonly attributes: {
    [attributeName in keyof P]: RuntimeType<P[attributeName]> | cdk.Token;
  };
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);
  }
}

export type CustomResourceRequest<P extends ResourceProperties> = {
  ResourceProperties?: RuntimeShape<P>;
  OldResourceProperties?: RuntimeShape<P>;
} & Omit<RawCustomResourceRequest, 'ResourceProperties' | 'OldResourceProperties'>;

export interface RawCustomResourceRequest {
  RequestType: 'Create' | 'Delete' | 'Update';
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  ResourceType: string;
  LogicalResourceId: string;
  PhysicalResourceId: this['RequestType'] extends 'Create' | 'Delete' ? string : undefined;
  ResourceProperties?: {
    [key: string]: any;
  };
  OldResourceProperties: this['RequestType'] extends 'Update' ? { [key: string]: any; } : undefined;
}
