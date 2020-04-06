import { ArrayShape, BinaryShape, BoolShape, DynamicShape, IntegerShape, MapShape, NeverShape, NothingShape, NumberShape, NumericShape, RecordMembers, RecordShape, SetShape, Shape, ShapeGuards, ShapeVisitor, StringShape, TimestampShape } from '@punchcard/shape';
import { VExpression, VObject } from '../appsync';

export function toAttributeValue<S extends Shape>(shape: S, obj: VObject.Like<S>): VObject.Of<S> {
  return VObject.of(shape, toAttributeValueExpression(shape, obj));
}
export function toAttributeValueExpression<S extends Shape>(shape: S, obj: VObject.Like<S>): VExpression {
  if (VObject.isObject(obj) && ShapeGuards.isSetShape(shape)) {
    return toSetJson(shape.Items, obj);
  } else if (ShapeGuards.isRecordShape(shape)) {
    return toRecordJson(shape, obj);
  } else if (Array.isArray(obj) && (ShapeGuards.isArrayShape(shape) || ShapeGuards.isSetShape(shape))) {
    return toArrayJson(shape, obj);
  } else if (ShapeGuards.isSetShape(shape)) {
    return toSetJson(shape.Items, obj);
  } else if (ShapeGuards.isStringShape(shape) && typeof obj === 'string') {
    return VExpression.text(`{"S":"${obj}"}`);
  } else if (ShapeGuards.isTimestampShape(shape) && obj instanceof Date) {
    return VExpression.text((obj as Date).toISOString()); // TODO: probably should use appsync timestamp formatters
  } else if (ShapeGuards.isBoolShape(shape) && typeof obj === 'boolean') {
    return VExpression.text(`{"BOOL":${obj}}`);
  } else if (ShapeGuards.isBinaryShape(shape)) {
    if (Buffer.isBuffer(obj)) {
      return VExpression.text(`{"B":"${(obj as Buffer).toString('base64')}"}`);
    } else if (typeof obj === 'string') {
      return VExpression.text(`{"B":"${obj}"}`);
    }
  }
  // use the toDynamoDBJson util by default
  return toDynamoDBJson(obj);
}

function toRecordJson<T extends RecordShape<RecordMembers>>(shape: T, obj: VObject.Like<T>): VExpression {
  const members = Object.entries(shape.Members);

  return VExpression.concat(
    VExpression.text('{'),
    ...members.map(([memberName, memberShape], i) => VExpression.concat(
      VExpression.text(`"${memberName}":`),
      toAttributeValueExpression(memberShape, (obj as any)[memberName]),
      VExpression.text(i < members.length - 1  ? ',' : '')
    )),
    VExpression.text('}'),
  );
}

function toArrayJson(shape: ArrayShape<Shape> | SetShape<Shape>, obj: VObject.Like<ArrayShape<Shape> | SetShape<Shape>>): VExpression {
  const type =
    ShapeGuards.isSetShape(shape) ?
      ShapeGuards.isStringShape(shape.Items) ? 'SS' :
      ShapeGuards.isTimestampShape(shape.Items) ? 'SS' :
      ShapeGuards.isNumericShape(shape.Items) ? 'NS' :
      ShapeGuards.isBinaryShape(shape.Items) ? 'BS' :
      (() => { throw new Error(`Unsupported Shape Set Type: ${shape.Items}`); }) :
    'L'
  ;
  return VExpression.concat(
    VExpression.text(`{"${type}":[`),
    ...(() => {
      if (type === 'L') {
        // array literal, so go through each item and encode them with their DynamoDB Json encoding
        return (obj as VObject.Like<any>[]).map(o => toAttributeValueExpression(shape.Items, o));
      } else {
        // the values of sets should be pure strings
        return [
          VExpression.text('['),
          ...(obj as VObject.Like<any>[]).map(o => {
            if (typeof o === 'string') {
              return VExpression.text(o);
            } else if (typeof o === 'number') {
              return VExpression.text(o.toString(10));
            } else if (Buffer.isBuffer(o)) {
              return VExpression.text(o.toString('base64'));
            } else if (VObject.isObject(o)) {
              return VObject.exprOf(o);
            } else {
              throw new Error(`could not handle VObject: ${o}`);
            }
          }),
          VExpression.text(']'),
        ];
      }
    })(),
    VExpression.text(']}')
  );
}

type SetShapes = StringShape | NumericShape | TimestampShape | BinaryShape;

function toSetJson(items: SetShapes, obj: VObject) {
  return VExpression.concat(
    VExpression.text(`$util.toJson(`),
    toSet(items, obj),
    VExpression.text(`)`),
  );
}
function toSet(items: SetShapes, obj: VObject) {
  return VExpression.concat(
    VExpression.text(`$util.dynamodb.${
      ShapeGuards.isStringShape(items) || ShapeGuards.isTimestampShape(items) ? 'toStringSet' :
      ShapeGuards.isNumericShape(items) ? 'toNumberSet' :
      'toBinarySet'
    }(`),
    VObject.exprOf(obj),
    VExpression.text(')')
  );
}

function toDynamoDBJson(obj: VObject){
  return VExpression.concat(
    VExpression.text('$util.dynamodb.toDynamoDBJson('),
    VObject.exprOf(obj),
    VExpression.text(')'),
  );
}