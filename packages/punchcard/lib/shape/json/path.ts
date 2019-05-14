import { Tree, TreeFields } from '../../tree';
import { Kind, Type } from '../types';

export class JsonPath<V> extends Tree<JsonPath<any>> {
  public readonly kind: Kind;

  constructor(parent: JsonPath<any>, name: string, public readonly type: Type<V>) {
    super(parent, name);
    this.kind = type.kind;
  }

  protected [TreeFields.join](left: string, right: string): string {
    return left + right;
  }
}

export type InferJsonPathType<T extends Type<any>> = ReturnType<T['toJsonPath']>;
