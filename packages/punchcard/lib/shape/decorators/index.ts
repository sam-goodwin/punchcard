import { OptionalShape } from '../optional';
import { Shape } from '../shape';
import { StringShape } from '../string';

// tslint:disable: ban-types
// tslint:disable: variable-name

type Is<T, K extends keyof T, V> =
  T[K] extends V ? K :
  T[K] extends OptionalShape<infer Inner> ? Inner extends V ? K : never
  : ['expected a', V, 'type, but received', T[K], never]; // <- hacky way to provide better errors to consumers

export const MaxLength = (length: number) => PropertyAnnotation<StringShape>((target, propertyKey) => {});
export const PropertyName = (name: string) => PropertyAnnotation<Shape>((target, propertyKey) => {});

export function PropertyAnnotation<Prop>(f: (target: Object, propertyKey: string) => void): <T extends Object, K extends keyof T>(target: T, propertyKey: Is<T, K, Prop>) => void {
  return f as any;
}

export function DataType(props: {version: number}): ClassDecorator {
  return () => null as any;
}
