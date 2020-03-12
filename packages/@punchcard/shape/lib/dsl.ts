import { Record } from './record';
import { Shape } from './shape';

export class DSL<T extends Shape> {
  constructor(shape: T) {
    // proxy that lazily applies DSL generators to a type
    return new Proxy(this, {
      get: (target: DSL<T>, propertyKey: string | symbol | number, receiver: any) => {
        if (propertyKey in target) {
          return (target as any)[propertyKey];
        }
        if (propertyKey in dslRegistry) {
          (target as any)[propertyKey] = dslRegistry[propertyKey](shape);
        }
        return undefined;
      }
    });
  }
}

const _global = global as any;
const dsls = Symbol.for('@punchcard/shape.Dsls');
if (_global[dsls] === undefined) {
  _global[dsls] = {};
}
const dslRegistry = _global[dsls];

export function registerDsl(id: string | symbol, f: <T>(shape: T) => any) {
  if(dslRegistry[id] !== undefined) {
    throw new Error(`DSL already registered`);
  }
  dslRegistry[id] = f;
}

export function dsl<T extends Shape>(shape: T): DSL<T> {
  return new DSL(shape);
}

class A extends Record({}) {
  public static readonly DSL = dsl(A);
}


