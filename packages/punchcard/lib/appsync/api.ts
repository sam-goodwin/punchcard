import type * as appsync from '@aws-cdk/aws-appsync';

import { Build } from '../core/build';
import { CDK } from '../core/cdk';
import { Construct, Scope } from '../core/construct';
import { Resource } from '../core/resource';
import { VInterpreter } from './intepreter';
import { Resolved } from './syntax/resolver';

export interface ApiProps extends Omit<appsync.GraphQLApiProps,
  'schemaDefinition' |
  'schemaDefinitionFile'
> {}

export class GraphQLApi extends Construct implements Resource<appsync.GraphQLApi> {
  public readonly resource: Build<appsync.GraphQLApi>;
  public readonly interpret: Build<void>;
  constructor(scope: Scope, id: string, props: Build<ApiProps>) {
    super(scope, id);
    this.resource = Build.concat(
      CDK,
      Scope.resolve(scope),
      props
    ).map(([{appsync}, scope, props]) => new appsync.GraphQLApi(scope, id, {
      ...props,
      schemaDefinition: deriveSchema(),
    }));

    this.interpret = CDK.chain(({appsync}) => this.resource.map(api => {
      const interpreter = new VInterpreter(api);
      for (const [fieldName, value] of Object.entries(this)) {
        if (Resolved.isResolved(value)) {
          console.log(fieldName, value);
          interpreter.interpret(fieldName, value);
        }
      }
    }));

    function deriveSchema(): string {
      return 'todo';
    }
  }
}
