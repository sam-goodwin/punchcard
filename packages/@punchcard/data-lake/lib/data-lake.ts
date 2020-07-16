import { Database } from '@aws-cdk/aws-glue';
import { TypeShape } from '@punchcard/shape';
import { ElasticSearch } from 'punchcard';
import { Build } from 'punchcard/lib/core/build';
import { CDK } from 'punchcard/lib/core/cdk';
import { Construct, Scope } from 'punchcard/lib/core/construct';
import { IndexSettings } from 'punchcard/lib/elasticsearch';
import { DataPipeline } from './data-pipeline';
import { Schema } from './schema';

export interface DataLakeProps {
  lakeName: string;
  domain?: ElasticSearch.Domain;
}
export class DataLake extends Construct {
  public readonly database: Build<Database>;
  public readonly domain: ElasticSearch.Domain;

  constructor(_scope: Scope, id: string, props: DataLakeProps) {
    super(Scope.resolve(_scope), id);
    const scope = CDK.chain(({core}) => Scope.resolve(_scope).map(scope => new core.Construct(scope, id)));

    this.database = scope.map(scope => new Database(scope, 'Database', {
      databaseName: props.lakeName
    }));
    this.domain = props.domain || new ElasticSearch.Domain(scope, 'Domain', {
      version: ElasticSearch.Version.V7_4,
      ebsOptions: {
        iops: 1000,
        volumeSize: 128, // GB
        volumeType: ElasticSearch.EbsVolumeType.io1, // high performance
      },
      elasticsearchClusterConfig: {
        instanceType: 'c5.large.elasticsearch',
        dedicatedMasterEnabled: true,
        dedicatedMasterCount: 2,
        dedicatedMasterType: 'c5.large.elasticsearch',
        instanceCount: 1,
        zoneAwarenessEnabled: false,
      },
    });
  }

  public addDataType<
    T extends TypeShape<any, string>,
    TS extends keyof T['Members'],
    ID extends keyof T['Members']
  >(props: DataTypeProps<T, TS, ID>): DataPipeline<T, TS, ID> {
    return new DataPipeline(this, props.type.FQN!, {
      schema: new Schema({
        id: props.id,
        schemaName: props.type.FQN!,
        shape: props.type,
        timestampField: props.timestamp as any
      }),
      indexSettings: props.indexSettings
    });
  }
}

export interface DataTypeProps<
  T extends TypeShape<any, string>,
  TS extends keyof T['Members'],
  ID extends keyof T['Members']
> {
  id: ID;
  type: T;
  timestamp: TS;
  indexSettings?: IndexSettings;
}
