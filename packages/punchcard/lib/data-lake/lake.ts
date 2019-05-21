import { Database } from '@aws-cdk/aws-glue';
import cdk = require('@aws-cdk/cdk');
import { DataPipeline } from './pipeline';
import { Schema, Schemas } from './schema';

export interface DataLakeProps<S extends Schemas> {
  lakeName: string;
  schemas: S;
}
export class DataLake<S extends Schemas> extends cdk.Construct {
  public readonly database: Database;
  public readonly pipelines: Pipelines<S>;

  constructor(scope: cdk.Construct, id: string, props: DataLakeProps<S>) {
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

type Pipeline<T> = T extends Schema<infer S, infer T> ? DataPipeline<S, T> : never;
type Pipelines<S extends Schemas> = {
  [schemaName in keyof S]: Pipeline<S[schemaName]>;
};
