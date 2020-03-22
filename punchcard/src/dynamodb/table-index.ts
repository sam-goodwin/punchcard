import * as AWS from "aws-sdk";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as iam from "@aws-cdk/aws-iam";
import {DDB, IndexClient} from "@punchcard/shape-dynamodb";
import {Pointer, RecordShape, Shape} from "@punchcard/shape";
import {CDK} from "../core/cdk";
import {Dependency} from "../core/dependency";
import {Run} from "../core/run";
import {Table} from "./table";
import {keyType} from "./util";

export interface IndexProps<
  SourceTable extends Table<any, any>,
  Projection extends Shape.Like<RecordShape>,
  Key extends DDB.KeyOf<Shape.Resolve<Projection>>
> {
  /**
   * Name of the Index.
   */
  indexName: string;
  /**
   * Typeof index: `global` or `local`.
   */
  indexType: "global" | "local";
  /**
   * The key by which the Index will be queried.
   */
  key: Key;
  /**
   * Type of data projected from the SourceTable
   */
  projection: Pointer<Projection>;
  /**
   * Table this index is for.
   */
  sourceTable: SourceTable;
}

/**
 * Represents an Index of a DynamoDB Table
 */
export class Index<
  SourceTable extends Table<any, any>,
  Projection extends Shape.Like<RecordShape>,
  Key extends DDB.KeyOf<Shape.Resolve<Projection>>
> {
  /**
   * Source Table of this Index.
   */
  public readonly sourceTable: SourceTable;

  /**
   * Shape of data in the table.
   */
  public readonly projection: Pointer<Projection>;

  /**
   * The table's key (hash key, or hash+sort key pair).
   */
  public readonly key: Key;

  /**
   * Name of the Index.
   */
  public readonly indexName: string;

  /**
   * Type of index (`global` or `local`).
   */
  public readonly indexType: "global" | "local";

  constructor(props: IndexProps<SourceTable, Projection, Key>) {
    this.indexName = props.indexName;
    this.indexType = props.indexType;
    this.sourceTable = props.sourceTable;
    this.key = props.key;
    this.projection = props.projection || props.sourceTable.dataType;

    const type: any = this.projection;

    CDK.chain(({dynamodb}) =>
      this.sourceTable.resource.map((table) => {
        const partitionKey = {
          name: this.key.partition,
          type: keyType(type.members[this.key.partition]),
        };
        const sortKey = this.key.sort
          ? {
              name: this.key.sort,
              type: keyType(type.members[this.key.sort]),
            }
          : undefined;

        // the names of both the table and the index's partition+sort keys.
        // projections are required to at least have these properties
        const KEY_MEMBERS = new Set(
          [this.key.partition, this.key.sort].filter((_) => _ !== undefined),
        );

        // const projection = ShapeGuards.isShape(props.projection) ? props.projection : props.projection();
        // name of the properties in the projection
        const PROJECTION_MEMBERS = new Set(
          Object.keys(Shape.resolve(Pointer.resolve(this.projection)).Members),
        );
        for (const KEY of KEY_MEMBERS.values()) {
          if (!PROJECTION_MEMBERS.has(KEY as string)) {
            throw new Error(`invalid projection, missing key: ${KEY}`);
          }
        }

        // all properties in the Table
        const TABLE_MEMBERS = new Set(
          Object.keys(props.sourceTable.dataType.members),
        );

        const projectionType =
          PROJECTION_MEMBERS.size === TABLE_MEMBERS.size
            ? dynamodb.ProjectionType.ALL
            : PROJECTION_MEMBERS.size === KEY_MEMBERS.size
            ? dynamodb.ProjectionType.KEYS_ONLY
            : dynamodb.ProjectionType.INCLUDE;

        const definition: any = {
          indexName: this.indexName,
          partitionKey,
          projectionType,
          sortKey,
        };
        if (projectionType === dynamodb.ProjectionType.INCLUDE) {
          definition.nonKeyAttributes = [...PROJECTION_MEMBERS.values()].filter(
            (p) => !KEY_MEMBERS.has(p),
          );
        }
        if (this.indexType === "global") {
          table.addGlobalSecondaryIndex(definition);
        } else {
          if (definition.sortKey === undefined) {
            throw new Error(
              `sortKey cannot be undefined when creating a Local Secondary Index`,
            );
          }
          delete definition.partitionKey;
          table.addLocalSecondaryIndex(definition);
        }
      }),
    );
  }

  /**
   * Provides access to scan and query the Index.
   */
  public readAccess(): Dependency<IndexClient<Shape.Resolve<Projection>, Key>> {
    return this.dependency((table, target) => {
      table.grantReadData(target);
    });
  }

  // TODO: ??
  // public readonly queryAccess()
  // public readonly scanAccess()

  private dependency(
    grant: (table: dynamodb.Table, grantable: iam.IGrantable) => void,
  ): Dependency<IndexClient<Shape.Resolve<Projection>, Key>> {
    return {
      bootstrap: Run.of(
        (ns, cache): Promise<IndexClient<Shape.Resolve<Projection>, Key>> => {
          return Promise.resolve(
            new IndexClient({
              client: cache.getOrCreate(
                "aws:dynamodb",
                () => new AWS.DynamoDB(),
              ),
              data: Shape.resolve(Pointer.resolve(this.projection)) as any,
              indexName: ns.get("indexName"),
              key: this.key as any,
              tableName: ns.get("tableName"),
            }),
          );
        },
      ),
      install: this.sourceTable.resource.map(
        (table) => (ns, grantable): void => {
          ns.set("tableName", table.tableName);
          ns.set("indexName", this.indexName);
          grant(table, grantable);
        },
      ),
    };
  }
}

export namespace Index {
  /**
   * Constrains an Index to a valid Projection of a SourceTable.
   */
  export type Of<
    SourceTable extends Table<any, any>,
    Projection extends Shape.Like<RecordShape>,
    Key extends DDB.KeyOf<Shape.Resolve<Projection>>
  > = Index<
    SourceTable,
    Table.Data<SourceTable>["members"] extends Shape.Resolve<
      Projection
    >["Members"]
      ? Projection
      : never,
    Key
  >;

  export interface GlobalProps<
    Projection extends Shape.Like<RecordShape>,
    Key extends DDB.KeyOf<Shape.Resolve<Projection>>
  > {
    /**
     * Name of the Secondary Index.
     */
    indexName: string;
    /**
     * Key by which the Index will be queried.
     */
    key: Key;
    /**
     * Read capacity of the Index.
     */
    readCapacity?: number;
    /**
     * Write capacity of the Index.
     */
    writerCapacity?: number;
  }

  export interface LocalProps<
    Projection extends Shape.Like<RecordShape>,
    Key extends keyof Shape.Resolve<Projection>["Members"]
  > {
    /**
     * Name of the Secondary Index.
     */
    indexName: string;
    /**
     * Key by which the Index will be queried.
     */
    key: Key;
    /**
     * Read capacity of the Index.
     */
    readCapacity?: number;
    /**
     * Write capacity of the Index.
     */
    writerCapacity?: number;
  }
}
