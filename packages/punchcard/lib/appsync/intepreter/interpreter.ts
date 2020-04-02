import appsync = require('@aws-cdk/aws-appsync');
import { Shape } from '@punchcard/shape';

import { foldFree } from 'fp-ts-contrib/lib/Free';
import { identity } from 'fp-ts/lib/Identity';

import { Build } from '../../core/build';
import { VExpression } from '../syntax/expression';
import { StatementF, StatementGuards } from '../syntax/statement';
import { VTL } from '../types';
import { VObject } from '../types/object';
import { Frame } from './frame';

interface ResolverStage {
  requestTemplate: string;
  responseTemplate: string;
  dataSource: Build<appsync.BaseDataSource>;
}

export interface CompiledResolver {
  typeName: string;
  fieldName: string;
  arguments: {
    [argumentName: string]: Shape;
  };
  beforeTemplate: string;
  stages: ResolverStage[]
  afterTemplate: string;
}

export class VInterpreter {
  private frame: Frame = new Frame();

  constructor(public readonly api: appsync.GraphQLApi) {

  }

  public interpret(typeName: string, fieldName: string, program: StatementF<VObject>): CompiledResolver {
    const stages: ResolverStage[] = [];

    foldFree(identity)((stmt => {
      if (StatementGuards.isCall(stmt)) {
        const requestTemplate = this.frame
          .interpret(stmt.request)
          .render();

        this.frame = new Frame();

        const responseTemplate = this.frame
          .interpret(stmt.response)
          .render();

        stages.push({
          dataSource: null as any,
          requestTemplate,
          responseTemplate,
        });
      } else if (StatementGuards.isSet(stmt)) {
        /**
         * Compute a value and store it in the stash.
         */
        const name = stmt.id || this.frame.getNewId();

        this.frame.print(`$util.qr($ctx.stash.put("${name}",`);
        this.frame.interpret(stmt.value);
        this.frame.print(`))`);

        return VTL.clone(stmt.value, new VExpression(() => `$ctx.stash.${name}`));
      } else {
        throw new Error(`unknown statement type: ${stmt._tag}`);
      }
      return null as any;
    }), program);

    return {
      typeName,
      fieldName,
      afterTemplate: 'todo',
      arguments: {},
      beforeTemplate: 'todo',
      stages
    };
  }
}
