import { Shape, ShapeGuards } from '@punchcard/shape';
import { VExpression, VObject } from '../../appsync';

export function toAttributeValue<S extends Shape>(shape: S, obj: VObject.Like<S>): VObject.Like<S> {
  return VObject.ofExpression(shape, toAttributeValueExpression(shape, obj, true));
}
export function toAttributeValueExpression<S extends Shape>(shape: S, obj: VObject.Like<S>, topLevel: boolean = true): VExpression {
  if (!VObject.isObject(obj)) {
    if (ShapeGuards.isArrayShape(shape) && Array.isArray(obj)) {
      const list = (obj as VObject.Like<Shape>[]);
      return VExpression.json({
        L: list.map(o => toAttributeValueExpression(shape.Items, o, false))
      });
    } else if (ShapeGuards.isMapShape(shape)) {
      const map = (obj as {[key: string]: VObject.Like<Shape>});
      return VExpression.json({
        M: Object.entries(map)
          .map(([name, value]) => ({
            [name]: toAttributeValueExpression(shape.Items, value, false)
          }))
          .reduce((a, b) => ({...a, ...b}))
      });
    } else if (ShapeGuards.isSetShape(shape) && Array.isArray(obj)) {
      const type = ShapeGuards.isStringShape(shape.Items) || ShapeGuards.isTimestampShape(shape.Items) ? 'SS' :
        ShapeGuards.isNumberShape(shape.Items) ? 'NS' :
        'BS'
      ;

      return VExpression.json({
        [type]: obj as VObject.Like<Shape>[]
      });
    } else if (ShapeGuards.isRecordShape(shape)) {
      const record = obj as {[key: string]: VObject.Like<Shape>; };
      const M = Object.entries(shape.Members).map(([name, shape]) => ({
        [name]: toAttributeValueExpression(shape, record[name], false)
      })).reduce((a, b) => ({...a, ...b}));
      return VExpression.json(topLevel ? M : {M});
    } else if (typeof obj === 'string') {
      return VExpression.json({
        S: obj
      });
    } else if (typeof obj === 'number') {
      return VExpression.json({
        N: (obj as number).toString(10)
      });
    } else if (typeof obj === 'undefined') {
      return VExpression.json({
        NULL: true
      });
    } else if (typeof obj === 'boolean') {
      return VExpression.json({
        BOOL: obj
      });
    }
  } else if (ShapeGuards.isSetShape(shape)) {
    return toSet(shape.Items, obj);
  }
  return toDynamoDBJson(obj);
}

function toSet(items: Shape, obj: VObject) {
  return VExpression.concat(
    VExpression.text(`$util.dynamodb.${
      ShapeGuards.isStringShape(items) || ShapeGuards.isTimestampShape(items) ? 'toStringSet' :
      ShapeGuards.isNumberShape(items) ? 'toNumberSet' :
      ShapeGuards.isBinaryShape(items) ? 'toBinarySet' :
      'toList'
    }Json(`),
    VObject.getExpression(obj),
    VExpression.text(')')
  );
}

function toDynamoDBJson(obj: VObject){
  return VExpression.concat(
    VExpression.text('$util.dynamodb.toDynamoDBJson('),
    VObject.getExpression(obj),
    VExpression.text(')'),
  );
}
