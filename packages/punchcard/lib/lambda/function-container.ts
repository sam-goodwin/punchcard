import { AnyShape, ShapeOrRecord, UnknownShape } from "@punchcard/shape";
import { Build } from "../core/build";
import { Function, FunctionProps, HandlerProps } from "./function";

import type * as cdk from '@aws-cdk/core';
import { Dependency } from "../core/dependency";

export type LambdaHandler<T = any, U = any, D = any> = (event: T, client: D, context: any) => Promise<U>;

/**
 * A Lambda Function with many handlers.
 */
export class FunctionContainer {
  public readonly handlers: {
    [handlerName: string]: LambdaHandler;
  } = {};

  public readonly function: Function<AnyShape, AnyShape, any>;

  constructor(scope: Build<cdk.Construct>, id: string, props: FunctionProps<AnyShape, AnyShape, any>) {
    this.function = new Function(scope, id, props, async (event, dependencies, context) => {
      const handlerId = event.__handlerId;
      if (handlerId === undefined) {
        throw new Error(`expected __handlerId`);
      }
    });
  }

  public addHandler<T extends ShapeOrRecord = AnyShape, U extends ShapeOrRecord = AnyShape, D extends Dependency | undefined = undefined>(
      id: string, props: HandlerProps<T, U, D>, handler: LambdaHandler<T, U, D>) {
    if (this.handlers[id] !== undefined) {
      throw new Error(`handler already registered with ID: ${id}`);
    }
  }
}