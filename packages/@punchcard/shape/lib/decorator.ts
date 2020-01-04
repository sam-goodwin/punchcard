import 'reflect-metadata';

// tslint:disable: ban-types
// tslint:disable: variable-name

type Is<T, K extends keyof T, V> =
  T[K] extends V ? K :
  ['expected a', V, 'type, but received', T[K], never]; // <- hacky way to provide better errors to consumers

export function PropertyAnnotation<Prop>(f: (target: Object, propertyKey: string) => void): <T extends Object, K extends keyof T>(target: T, propertyKey: Is<T, K, Prop>) => void {
  return f as any;
}
