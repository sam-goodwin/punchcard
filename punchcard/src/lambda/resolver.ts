import * as iam from "@aws-cdk/aws-iam";
import {Statement, StatementF} from "../appsync/intepreter/statement";
import {Build} from "../core/build";
import {GraphQL} from "../appsync/graphql";
import {Function as LambdaFunction} from "../lambda";
import {Shape} from "@punchcard/shape";
import {liftF} from "fp-ts-contrib/lib/Free";

export const invokeLambda = <A extends Shape, B extends Shape>(
  fn: LambdaFunction<A, B, any>,
  input: GraphQL.TypeOf<A>,
  _role?: Build<iam.Role>,
): StatementF<GraphQL.TypeOf<B>> =>
  liftF(new InvokeLambda<GraphQL.TypeOf<B>>(fn, input));

export function isInvokeLambda(a: any): a is InvokeLambda<any> {
  return a._tag === "InvokeLambda";
}

export class InvokeLambda<A> {
  _URI: Statement.URI;
  _A: A;
  _tag: "InvokeLambda" = "InvokeLambda";
  // more: A;

  constructor(
    public readonly fn: LambdaFunction<any, any>,
    public readonly input: any,
    public readonly role?: Build<iam.Role>,
  ) {}
}
