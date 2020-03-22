import appsync = require('@aws-cdk/aws-appsync');
import { identity } from 'fp-ts/lib/Identity';
import { Build } from '../../core/build';
import { Frame } from './frame';
import { StatementGuards } from './statement';

import { Resolved } from './resolver';

import { Shape } from '@punchcard/shape';
import { foldFree } from 'fp-ts-contrib/lib/Free';
import { VObject } from '../types/object';

interface ResolverStage {
  requestTemplate: string;
  responseTemplate: string;
  dataSource: Build<appsync.BaseDataSource>;
}

export interface CompiledResolver {
  arguments: {
    [argumentName: string]: Shape.Like
  },
  beforeTemplate: string;
  stages: ResolverStage[]
  afterTemplate: string;
}

export class VInterpreter {
  public static render(type: VObject): string {
    const frame = new Frame(undefined, new Frame());
    frame.interpret(type);
    // console.log(frame);
    return frame.render();
  }

  public static interpretResolver(resolved: Resolved<any>) {
    const compiledProgram: Partial<CompiledResolver> = {
      stages: []
    };

    const root = new Frame();
    const frame = root;

    const stages: ResolverStage[] = [];

    foldFree(identity)((stmt => {
      if (StatementGuards.isCall(stmt)) {
        const dataSource = stmt.dataSource.dataSource('todo');
        const requestTemplate = VInterpreter.render(stmt.request);
        const responseTemplate = VInterpreter.render(stmt.response);

        stages.push({
          dataSource,
          requestTemplate,
          responseTemplate,
        });
      } else if (StatementGuards.isSet(stmt)) {

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
  }
}
