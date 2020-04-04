import { ArrayShape, BinaryShape, BoolShape, MapShape, NumericShape, Pointer, RecordShape, RecordType, SetShape, Shape, StringShape, TimestampShape } from '@punchcard/shape';
import { VBool, VFloat, VInteger, VList, VObject, VString } from '../vtl-object';

export class $DynamoDBUtil {
  /**
   * General object conversion tool for DynamoDB that converts input objects to the appropriate
   * DynamoDB representation. It’s opinionated about how it represents some types: e.g., it will
   * use lists (“L”) rather than sets (“SS”, “NS”, “BS”). This returns an object that describes
   * the DynamoDB attribute value.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDB<T extends VObject>(object: T): VObject.Of<ToDynamoDBJson<VObject.TypeOf<T>>> {
    throw new Error('todo');
  }

  /**
   * The same as $util.dynamodb.toDynamoDB(Object) : Map, but returns the DynamoDB attribute value
   * as a JSON encoded string.
   *
   * @param object value to convert to its DynamoDB encoding
   */
  public toDynamoDBJson<T extends VObject>(object: T): VString {
    throw new Error('todo');
  }

  public toBoolean(bool: VBool): VObject.Of<ToDynamoDBJson<BoolShape>> {
    throw new Error('todo');
  }

  public toNumber<N extends VInteger | VFloat>(number: N): VObject.Of<ToDynamoDBJson<VObject.TypeOf<N>>> {
    throw new Error('todo');
  }

  public toString(value: VString): VObject.Of<ToDynamoDBJson<StringShape>> {
    throw new Error('todo');
  }

  public toStringSet(value: VList<VString>): VObject.Of<RecordType<{
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
export type ToDynamoDBJson<T extends Shape> =
  T extends NumericShape ? RecordType<{ S: StringShape }> :
  T extends StringShape ? RecordType<{ S: StringShape }> :
  T extends TimestampShape ? RecordType<{ S: TimestampShape }> :
  T extends BoolShape ? RecordType<{ BOOL: BoolShape; }> :
  T extends BinaryShape ? RecordType<{ B: StringShape; }> :
  T extends SetShape<infer I> ? RecordType<{
    L: ArrayShape<ToDynamoDBJson<I>>;
  }> :
  T extends ArrayShape<infer I> ? RecordType<{
    L: ArrayShape<ToDynamoDBJson<I>>;
  }> :
  T extends MapShape<infer V> ? RecordType<{
    M: MapShape<ToDynamoDBJson<V>>;
  }> :
  T extends RecordType<infer M> ? RecordType<{
    M: RecordType<{
      [m in keyof M]: ToDynamoDBJson<M[m]>;
    }>
  }> :
  T extends RecordShape<infer M> ? RecordType<{
    M: RecordType<{
      [m in keyof M]: ToDynamoDBJson<M[m]>;
    }>
  }> :
  T extends RecordType<infer M> ? RecordType<{
    M: RecordType<{
      [m in keyof M]: ToDynamoDBJson<M[m]>;
    }>
  }> :
  never
  ;
