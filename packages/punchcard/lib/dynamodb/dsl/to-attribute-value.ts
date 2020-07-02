import { Shape, ShapeGuards, TypeShape } from '@punchcard/shape';
import { VExpression, VObject, VRecord } from '../../appsync';

// TODO: clean this piece of shit up!

export function toAttributeValueJson<S extends Shape>(
  shape: S,
  obj: VObject.Like<S>,
  topLevel: boolean = true
): VExpression {
  if (topLevel && !ShapeGuards.isRecordShape(shape)) {
    throw new Error('top level is only supported for record shapes');
  }
  if (VObject.isObject(obj) && !topLevel) {
    return toDynamoDBJson(obj);
  }

  if (ShapeGuards.isArrayShape(shape) && Array.isArray(obj)) {
    const list = (obj as VObject.Like<Shape>[]);
    return VExpression.json({
      L: list.map(o => toAttributeValueJson(shape.Items, o, false))
    });
  } else if (ShapeGuards.isMapShape(shape)) {
    const map = (obj as {[key: string]: VObject.Like<Shape>});
    return VExpression.json({
      M: Object.entries(map)
        .map(([name, value]) => ({
          [name]: toAttributeValueJson(shape.Items, value, false)
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
    if (VObject.isObject(obj)) {
      console.error(obj);
      throw new Error('support top-level object');
    } else {
      const record = obj as {[key: string]: VObject.Like<Shape>; };
      const M = Object.entries(shape.Members).map(([name, shape]) => ({
        [name]: toAttributeValueJson(shape, record[name], false)
      })).reduce((a, b) => ({...a, ...b}));
      return VExpression.json(topLevel ? M : {M});
    }
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
  } else if (ShapeGuards.isSetShape(shape)) {
    return toSet(shape.Items, obj);
  }
  throw new Error(`blah`);
}

function toSet(items: Shape, obj: VObject) {
  return VExpression.concat(
    VExpression.text(`$util.dynamodb.${
      ShapeGuards.isStringShape(items) || ShapeGuards.isTimestampShape(items) ? 'toStringSet' :
      ShapeGuards.isNumberShape(items) ? 'toNumberSet' :
      ShapeGuards.isBinaryShape(items) ? 'toBinarySet' :
      'toList'
    }Json(`),
    VObject.getExpr(obj),
    VExpression.text(')')
  );
}

function toDynamoDBJson(obj: VObject){
  return VExpression.concat(
    VExpression.text('$util.dynamodb.toDynamoDBJson('),
    VObject.getExpr(obj),
    VExpression.text(')'),
  );
}
