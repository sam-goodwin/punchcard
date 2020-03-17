import { Shape } from '@punchcard/shape';
import { liftF } from 'fp-ts-contrib/lib/Free';
import Lambda = require('../../../lib/lambda');
import { GraphQL } from '../types';
import { ResolverStatementF, URI } from './resolver';

export const invokeLambda = <A extends Shape, B extends Shape>(
  fn: Lambda.Function<A, B, any>,
  input: GraphQL.TypeOf<A>
): ResolverStatementF<GraphQL.TypeOf<B>> => liftF(new InvokeLambda<GraphQL.TypeOf<B>>(fn, input, ));

export function isInvokeLambda(a: any): a is InvokeLambda<any> {
  return a._tag === 'InvokeLambda';
}

export class InvokeLambda<A> {
  _URI: URI;
  _A: A;
  _tag: 'InvokeLambda' = 'InvokeLambda';
  // more: A;

  constructor(public readonly fn: Lambda.Function<any, any>, public readonly input: any,) {}
}