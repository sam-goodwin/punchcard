import { ArrayShape, BinaryShape, BoolShape, MapShape, NumericShape, RecordShape, RecordType, ShapeOrRecord, StringShape, StructShape, TimestampShape, SetShape } from '@punchcard/shape';
import { GraphQL } from '../types';

export class $DynamoDBUtil {
  /**
   * General object conversion tool for DynamoDB that converts input objects to the appropriate
   * DynamoDB representation. It’s opinionated about how it represents some types: e.g., it will
   * use lists (“L”) rather than sets (“SS”, “NS”, “BS”). This returns an object that describes
   * the DynamoDB attribute value.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDB<T extends GraphQL.Type>(object: T): GraphQL.Of<ToDynamoDBJson<GraphQL.ShapeOf<T>>> {
    throw new Error('todo');
  }

  /**
   * The same as $util.dynamodb.toDynamoDB(Object) : Map, but returns the DynamoDB attribute value
   * as a JSON encoded string.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDBJson<T extends GraphQL.Type>(object: T): GraphQL.String {
    throw new Error('todo');
  }

  public toBoolean(bool: GraphQL.Bool): GraphQL.Of<ToDynamoDBJson<BoolShape>> {
    throw new Error('todo');
  }

  public toNumber<N extends GraphQL.Integer | GraphQL.Number>(number: N): GraphQL.Of<ToDynamoDBJson<GraphQL.ShapeOf<N>>> {
    throw new Error('todo');
  }

  public toString(value: GraphQL.String): GraphQL.Of<ToDynamoDBJson<StringShape>> {
    throw new Error('todo');
  }

  public toStringSet(value: GraphQL.List<GraphQL.String>): GraphQL.Of<StructShape<{
    SS: ArrayShape<StringShape>
  }>> {
    throw new Error('todo');
  }
}

/**
 * Converts a Shape to its DynamoDB representation.
 *
 * According to the opinonated approach of `$util.dynamodb.toDynamoDB`
 *
 * @see https://docs.aws.amazon.com/appsync/latest/devguide/resolver-util-reference.html
 */
export type ToDynamoDBJson<T extends ShapeOrRecord> =
  T extends NumericShape ? StructShape<{ S: StringShape }> :
  T extends StringShape ? StructShape<{ S: StringShape }> :
  T extends TimestampShape ? StructShape<{ S: TimestampShape }> :
  T extends BoolShape ? StructShape<{ BOOL: BoolShape; }> :
  T extends BinaryShape ? StructShape<{ B: StringShape; }> :
  /**
   * 
   */
  T extends SetShape<infer I> ? StructShape<{
    L: ArrayShape<ToDynamoDBJson<I>>;
  }> :
  T extends ArrayShape<infer I> ? StructShape<{
    L: ArrayShape<ToDynamoDBJson<I>>;
  }> :
  T extends MapShape<infer V> ? StructShape<{
    M: MapShape<ToDynamoDBJson<V>>;
  }> :
  T extends StructShape<infer M> ? StructShape<{
    M: StructShape<{
      [m in keyof M]: ToDynamoDBJson<M[m]>;
    }>
  }> :
  T extends RecordShape<infer M> ? StructShape<{
    M: StructShape<{
      [m in keyof M]: ToDynamoDBJson<M[m]>;
    }>
  }> :
  T extends RecordType<any, infer M> ? StructShape<{
    M: StructShape<{
      [m in keyof M]: ToDynamoDBJson<M[m]>;
    }>
  }> :
  never
  ;
