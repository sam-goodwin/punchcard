import { Database } from '@aws-cdk/aws-glue';
import core = require('@aws-cdk/core');
import { DataPipeline } from './data-pipeline';
import { Schema, Schemas } from './schema';

export interface DataLakeProps<S extends Schemas> {
  lakeName: string;
  schemas: S;
}
export class DataLake<S extends Schemas> extends core.Construct {
  public readonly database: Database;
  public readonly pipelines: Pipelines<S>;

  constructor(scope: core.Construct, id: string, props: DataLakeProps<S>) {
    super(scope, id);
    this.database = new Database(this, 'Database', {
      databaseName: props.lakeName
    });
    this.pipelines = {} as any;
    for (const [alias, schema] of Object.entries(props.schemas)) {
      (this.pipelines as any)[alias] = new DataPipeline<any, any>(this, alias, {
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
