import appsync = require('@aws-cdk/aws-appsync');
import cdk = require('@aws-cdk/core');
import { foldFree, Free } from 'fp-ts-contrib/lib/Free';
import { Identity } from 'fp-ts/lib/Identity';
import { identity } from 'fp-ts/lib/Identity';
import { Build } from '../../core/build';
import { isDirective } from './directive';
import { isInvokeLambda } from './lambda';
import { ResolverStatement } from './resolver';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'id');
const api = new appsync.CfnGraphQLApi(stack, '', {
  name: 'MyApi',
  authenticationType: 'AMAZON_COGNITO_USER_POOLS',
});
new appsync.CfnGraphQLSchema(stack, '', {
  apiId: api.attrApiId,
  definition: 'TODO: synthesize'
});

new appsync.CfnDataSource(null, null, {

});

new appsync.CfnResolver(stack, '', {
  pipelineConfig: {
    functions: [
      fnConfig.ref
    ]
  },
  apiId: api.ref,
  fieldName: 'fieldName',
  typeName: 'typeName'
});

class ResolverInterpreter {
  public readonly resolvers: appsync.CfnFunctionConfiguration[] = [];
  public readonly dataSources = new WeakMap<any, appsync.BaseDataSource>();

  private readonly api: appsync.GraphQLApi;

  private preparingRequest: boolean = true;
  private requestMappingTemplate: string[] = [];
  private responseMappingTemplate: string[] = [];

  private ids = (function*() {
    let i = 0;
    while (true) {
      yield 'name_' + i.toString(10);
      i += 1;
    }
  })();

  constructor(scope: cdk.Construct, id: string, props: {
    api: appsync.GraphQLApi;
    fieldName: string;
    typeName: string;
  }) {
    new appsync.GraphQLApi(null, null, {
      schemaDefinition
    })

    new appsync.Resolver(this.api, this.ids.next().value, {
      api: this.api,
      fieldName: props.fieldName,
      typeName: props.typeName,
      pipelineConfig: {
        functions: [
          'todo'
        ]
      },

      // dataSource: 
    })
  }

  public interpret(program: Free<'Resolver', any>): appsync.CfnResolver {
    foldFree(identity)(this._interpret, program);
  }

  private readonly _interpret = <A>(p: ResolverStatement<A>): Identity<A> => {
    if (isInvokeLambda(p)) {
      const fn = Build.resolve(p.fn.resource);

      const name = this.ids.next().value;

      if (!this.dataSources.has(fn)) {
        this.dataSources.set(fn, new appsync.LambdaDataSource(this.api, this.ids.next().value, {
          api: this.api,
          lambdaFunction: fn,
          name: fn.functionName
        }));
      }
      const dataSource = this.dataSources.get(fn)!;

      const resolver = new appsync.CfnFunctionConfiguration(stack, 'id', {
        dataSourceName: dataSource.name,
        apiId: api.attrApiId,
        functionVersion: '2018-05-29',
        name,
        requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
        responseMappingTemplate: appsync.MappingTemplate.fromString(
          `$util.qr($ctx.stash.put("${name}", $util.$ctx.result))`),
      });

      this.resolvers.push();
    } else if (isDirective(p)) {
      this.requestMappingTemplate.push(p.directive);
    }

    return null as any;
  };
}
const pipelineEval = (api: appsync.CfnGraphQLApi) => {
};