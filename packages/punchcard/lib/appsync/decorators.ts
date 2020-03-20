// import { GraphQL } from './types';

import { GraphQL } from './graphql';
import { Resolved } from './intepreter/resolver';

export const Query: PropertyDecorator = () => {};

export const Mutation: PropertyDecorator = () => {};

// const arg = Symbol.for('punchcard/lib/appsync.Arg');
// const fieldResolver = Symbol.for('punchcard/lib/appsync.FieldResolver');
// const mutation = Symbol.for('punchcard/lib/appsync.Mutation');
// const query = Symbol.for('punchcard/lib/appsync.Query');

// export function Query<T extends GraphQL.RecordClass>(returns: (type?: any) => [T]): (
//   target: object,
//   propertyKey: string,
//   descriptior: TypedPropertyDescriptor<(...args: GraphQL.Type[]) => GraphQL<InstanceType<T>[]>>
// ) => TypedPropertyDescriptor<(...args: GraphQL.Type[]) => GraphQL<InstanceType<T>[]>>;

// export function Query<T extends GraphQL.RecordClass>(returns: (type?: any) => T): (
//   target: object,
//   propertyKey: string,
//   descriptior: TypedPropertyDescriptor<(...args: GraphQL.Type[]) => GraphQL<InstanceType<T>>>
// ) => TypedPropertyDescriptor<(...args: GraphQL.Type[]) => GraphQL<InstanceType<T>>>;

// // export function Query<T extends GraphQL.Type>(returns: (type: any) => [T | GraphQL.RecordClass<T>]): (target: object,
// //   propertyKey: string,
// //   descriptior: TypedPropertyDescriptor<() => GraphQL<T[]>>
// // ) => TypedPropertyDescriptor<() => GraphQL<T[]>>;

// // export function Query<T extends GraphQL.Type>(returns: (type: any) => T | GraphQL.RecordClass<T>): (target: object,
// //   propertyKey: string,
// //   descriptior: TypedPropertyDescriptor<() => GraphQL<T>>
// // ) => TypedPropertyDescriptor<() => GraphQL<T>>;
// export function Query(...args: any): any {
//   return null as any;
// }

// export function Mutation<T extends GraphQL.RecordClass>(target: (of?: any) => T): (
//   target: object,
//   propertyKey: string,
//   descriptior: TypedPropertyDescriptor<(...args: any[]) => GraphQL<InstanceType<T>>>
// ) => TypedPropertyDescriptor<(...args: any[]) => GraphQL<InstanceType<T>>> {
//   return null as any;
//   // return (target, propertyKey, descriptor) => {
//   //   Reflect.defineMetadata(mutation, 'mutation', target, propertyKey);
//   //   // return descriptor;
//   // };
// }



// export function FieldResolver<T extends GraphQL.RecordClass>(returns: (type?: undefined) => [T]): <On extends GraphQL.Type>(
//   target: On,
//   propertyKey: string,
//   descriptior: TypedPropertyDescriptor<(root: On, ...args: GraphQL.Type[]) => Resolved<GraphQL.List<InstanceType<T>>>>
// ) => TypedPropertyDescriptor<(root: On, ...args: GraphQL.Type[]) => Resolved<GraphQL.List<InstanceType<T>>>>;

// export function FieldResolver<T extends GraphQL.RecordClass>(returns: (type?: undefined) => T): <On extends GraphQL.Type>(
//   target: On,
//   propertyKey: string,
//   descriptior: TypedPropertyDescriptor<(root: On, ...args: GraphQL.Type[]) => Resolved<InstanceType<T>>>
// ) => TypedPropertyDescriptor<(root: On, ...args: GraphQL.Type[]) => Resolved<InstanceType<T>>>;

// export function FieldResolver(...args: any[]): any {

// }

// // export function FieldResolver2<
// //   T extends GraphQL.RecordClass,
// //   Target extends object,
// //   PropertyKey extends keyof Target
// // > (target: (on?: any) => T): (
// //   target: Target[PropertyKey] extends (...args: any[]) => GraphQL<InstanceType<T>> ? Target : never,
// //   propertyKey: PropertyKey
// // ) => void {
// //   return (target, propertyKey) => Reflect.defineMetadata(fieldResolver, propertyKey, target, propertyKey);
// // }

// export type ResolverTypePointer = (type: any) => GraphQL.Type;
// // export function getResolverPointer(target: any): ResolverTypePointer | undefined {
// //   return Reflect.getMetadata(resolver, target);
// // }
// // export function Resolver(type: (type: any) => GraphQL.Type | GraphQL.RecordClass): ClassDecorator {
// //   return (target) => Reflect.defineMetadata(resolver, target, type);
// // }

// export function Arg(id: string): ParameterDecorator {
//   return (target, propertyKey, index) => {
//     Reflect.defineMetadata(arg, id, target, propertyKey);
//   };
// }
