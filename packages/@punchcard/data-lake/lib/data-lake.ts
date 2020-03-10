import type { Construct } from '@aws-cdk/core';

import { Database } from '@aws-cdk/aws-glue';
import { Build } from 'punchcard/lib/core/build';
import { CDK } from 'punchcard/lib/core/cdk';
import { DataPipeline } from './data-pipeline';
import { Schema, Schemas } from './schema';

export interface DataLakeProps<S extends Schemas> {
  lakeName: string;
  schemas: S;
}
export class DataLake<S extends Schemas> {
  public readonly database: Build<Database>;
  public readonly pipelines: Pipelines<S>;

  constructor(_scope: Build<Construct>, id: string, props: DataLakeProps<S>) {
    const scope = CDK.chain(({core}) => _scope.map(scope => new core.Construct(scope, id)));

    this.database = scope.map(scope => new Database(scope, 'Database', {
      databaseName: props.lakeName
    }));
    this.pipelines = {} as any;
    for (const [alias, schema] of Object.entries(props.schemas)) {
      (this.pipelines as any)[alias] = new DataPipeline<any, any>(this.database, alias, {
        database: this.database,
        schema
      });
    }
  }
}

type InferPipeline<T> = T extends Schema<infer S, infer T> ? DataPipeline<S, T> : never;
type Pipelines<S extends Schemas> = {
  [schemaName in keyof S]: InferPipeline<S[schemaName]>;
};
