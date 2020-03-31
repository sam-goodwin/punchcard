import appsync = require('@aws-cdk/aws-appsync');
import { Shape } from '@punchcard/shape';

import { foldFree } from 'fp-ts-contrib/lib/Free';
import { identity } from 'fp-ts/lib/Identity';

import { Build } from '../../core/build';
import { ResolverImpl } from '../syntax/resolver';
import { StatementGuards } from '../syntax/statement';
import { VObject } from '../types/object';
import { Frame } from './frame';

interface ResolverStage {
  requestTemplate: string;
  responseTemplate: string;
  dataSource: Build<appsync.BaseDataSource>;
}

export interface CompiledResolver {
  arguments: {
    [argumentName: string]: Shape
  },
  beforeTemplate: string;
  stages: ResolverStage[]
  afterTemplate: string;
}

export class VInterpreter {
  constructor(public readonly api: appsync.GraphQLApi) {

  }

  public static render(type: VObject): string {
    console.log(type);
    const frame = new Frame(undefined);
    frame.interpret(type);
    return frame.render();
  }

  public interpret(fieldName: string, resolved: ResolverImpl<any, any>): CompiledResolver {
    const stages: ResolverStage[] = [];

    foldFree(identity)((stmt => {
      if (StatementGuards.isCall(stmt)) {
      console.log('call', stmt);
        const requestTemplate = VInterpreter.render(stmt.request);
        const responseTemplate = VInterpreter.render(stmt.response);

        stages.push({
          dataSource: null as any,
          requestTemplate,
          responseTemplate,
        });
      } else if (StatementGuards.isSet(stmt)) {
        console.log('stmt', stmt);
        // /**
        //  * Compute a value and store it in the stash.
        //  */
        // const name = stmt.id || frame.getNewId();

        // frame.variables.print(`$util.qr($ctx.stash.put("${name}",`);
        // frame.variables.interpret(stmt.value);
        // frame.variables.print(`))`);

        // return GraphQL.clone(stmt.value, new GraphQL.Expression(() => `$ctx.stash.${name}`));
      } else {
        throw new Error(`unknown statement type: ${stmt._tag}`);
      }
      return null as any;
    }), resolved.program);

    return {
      afterTemplate: 'todo',
      arguments: {},
      beforeTemplate: 'todo',
      stages
    };
  }
}
