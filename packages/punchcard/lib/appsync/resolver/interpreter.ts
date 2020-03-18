import appsync = require('@aws-cdk/aws-appsync');
import cdk = require('@aws-cdk/core');
import { foldFree, Free } from 'fp-ts-contrib/lib/Free';
import { Identity } from 'fp-ts/lib/Identity';
import { identity } from 'fp-ts/lib/Identity';
import { Build } from '../../core/build';
import { GraphQL } from '../types';
import { isDirective } from './directive';
import { isInvokeLambda } from './lambda';
import { isStash, Statement } from './statement';

// const app = new cdk.App();
// const stack = new cdk.Stack(app, 'id');
// const api = new appsync.CfnGraphQLApi(stack, '', {
//   name: 'MyApi',
//   authenticationType: 'AMAZON_COGNITO_USER_POOLS',
// });
// new appsync.CfnGraphQLSchema(stack, '', {
//   apiId: api.attrApiId,
//   definition: 'TODO: synthesize'
// });

// new appsync.CfnDataSource(null, null, {

// });

// new appsync.CfnResolver(stack, '', {
//   pipelineConfig: {
//     functions: [
//       fnConfig.ref
//     ]
//   },
//   apiId: api.ref,
//   fieldName: 'fieldName',
//   typeName: 'typeName'
// });

class ResolverInterpreter {
  public readonly resolvers: appsync.CfnFunctionConfiguration[] = [];
  public readonly dataSources = new WeakMap<any, appsync.BaseDataSource>();

  private readonly api: appsync.GraphQLApi;

  private preparingRequest: boolean = true;
  private mappingTemplate: string[] = [];

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
    // new appsync.GraphQLApi(null, null, {
    //   schemaDefinition
    // });

    // new appsync.Resolver(this.api, this.ids.next().value, {
    //   api: this.api,
    //   fieldName: props.fieldName,
    //   typeName: props.typeName,
    //   pipelineConfig: {
    //     functions: [
    //       'todo'
    //     ]
    //   },

    //   // dataSource:
    // });
  }

  // public interpret(program: Free<'Resolver', any>): appsync.Resolver {
  //   foldFree(identity)(this._interpret, program);
  // }

  public readonly interpret = <A extends GraphQL.Type>(statement: Statement<A>): Identity<A> => {
    const id = () => this.ids.next().value;

    if (isInvokeLambda(statement)) {
      const fn = Build.resolve(statement.fn.resource);

      const name = id();

      // if (!this.dataSources.has(fn)) {
      //   this.dataSources.set(fn, new appsync.LambdaDataSource(this.api, id(), {
      //     api: this.api,
      //     lambdaFunction: fn,
      //     name: fn.functionName,
      //     serviceRole: statement.role ? Build.resolve(statement.role) : undefined
      //   }));
      // }
      const dataSource = this.dataSources.get(fn)!;

      this.mappingTemplate.push(appsync.MappingTemplate.lambdaRequest(statement.input).renderTemplate());

      const requestMappingTemplate = appsync.MappingTemplate.fromString(this.mappingTemplate.join('\n'));
      // const resolver = dataSource.createResolver({
      //   fieldName: '',
      //   typeName: '',
      //   pipelineConfig: {
      //     functions: [
      //       'todo'
      //     ]
      //   },
      //   requestMappingTemplate,
      //   responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
      // });
      this.mappingTemplate = [];

      this.resolvers.push();
    } else if (isStash(statement)) {
      const name = statement.id || id();
      this.mappingTemplate.push(`$util.qr($ctx.stash.put("${name}", ${statement.value[GraphQL.expr].toVTL()}))`);
      return GraphQL.clone(statement.value, new GraphQL.ReferenceExpression(`$ctx.stash.${name}`));
    }

    return null as any;
  }
}
const pipelineEval = (api: appsync.CfnGraphQLApi) => {
};