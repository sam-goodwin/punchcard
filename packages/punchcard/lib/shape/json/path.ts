import { Tree, TreeFields } from '../../util/tree';
import { Kind } from '../kind';
import { Shape } from '../shape';

export class JsonPath<S extends Shape<any>> extends Tree<JsonPath<any>> {
  public readonly kind: Kind;

  constructor(parent: JsonPath<any>, name: string, public readonly shape: S) {
    super(parent, name);
    this.kind = shape.kind;
  }

  protected [TreeFields.join](left: string, right: string): string {
    return left + right;
  }
}

export type InferJsonPathType<T extends Shape<any>> = ReturnType<T['toJsonPath']>;
