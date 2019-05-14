export namespace TreeFields {
  export const parent = Symbol.for('tree.parent');
  export const children = Symbol.for('tree.children');
  export const name = Symbol.for('tree.name');
  export const path = Symbol.for('tree.path');
  export const join = Symbol.for('tree.join');
}

export class Tree<N extends Tree<N>> {
  public readonly [TreeFields.parent]?: N;
  public readonly [TreeFields.children]: { [name: string]: N };
  public readonly [TreeFields.name]: string;
  public readonly [TreeFields.path]: string;

  constructor(_parent: N, _name: string) {
    this[TreeFields.parent] = _parent;
    this[TreeFields.name] = _name;
    this[TreeFields.children] = {};

    if (_parent) {
      _parent[TreeFields.children][_name] = this as any;
      this[TreeFields.path] = this[TreeFields.join](_parent[TreeFields.path], _name);
    } else {
      this[TreeFields.path] = _name;
    }
  }

  protected [TreeFields.join](left: string, right: string) {
    return `${left}/${right}`;
  }
}
