import 'jest';

import { Core, DynamoDB, Shape, Util } from '../../lib';

export function custom(): Custom {
  return new Custom();
}
export class Custom extends Shape.CustomType<Custom.Shape> {
  constructor() {
    super(Custom.shape);
  }

  public toDynamoPath(parent: DynamoDB.DynamoPath, name: string): any {
    return new DynamoDB.BaseDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: Shape.JsonPath<any>, name: string): Custom.Path {
    return new Custom.Path(parent, name, this);
  }
}
export namespace Custom {
  export type Shape = typeof shape;
  export const shape = {
    id: Shape.string(),
    arr: Shape.array(Shape.string())
  };
  export class Path extends Shape.CustomPath<Shape, Custom> {
    public customOperation() {
      return this.fields.arr.slice(0, 1);
    }
  }
}

const tree = {
  stringField: Shape.string(),
  intField: Shape.integer(),
  numberField: Shape.float(),
  boolField: Shape.boolean,
  timestampField: Shape.timestamp,
  stringArray: Shape.array(Shape.string()),
  structArray: Shape.array(Shape.struct({
    item: Shape.string()
  })),

  stringMap: Shape.map(Shape.string()),
  structMap: Shape.map(Shape.struct({
    item: Shape.string()
  })),

  optionalArray: Shape.optional(Shape.array(Shape.string())),

  custom: custom(),

  struct: Shape.struct({
    stringField: Shape.string(),
    intField: Shape.integer(),
    numberField: Shape.float(),
    boolField: Shape.boolean,

    stringArray: Shape.array(Shape.string()),
    intArray: Shape.array(Shape.integer()),
    numberArray: Shape.array(Shape.float()),
    boolArray: Shape.array(Shape.boolean),

    stringMap: Shape.map(Shape.string()),
    intMap: Shape.map(Shape.integer()),
    numberMap: Shape.map(Shape.float()),
    boolMap: Shape.map(Shape.boolean),
  })
};

describe('json', () => {
  describe('path', () => {
    describe('child', () => {
      it('$.stringField', () => {
        expect(Shape.jsonPath(tree).stringField[Util.TreeFields.path]).toEqual("$['stringField']");
      });
      it('$.intField', () => {
        expect(Shape.jsonPath(tree).intField[Util.TreeFields.path]).toEqual("$['intField']");
      });
      it('$.numberField', () => {
        expect(Shape.jsonPath(tree).numberField[Util.TreeFields.path]).toEqual("$['numberField']");
      });
      it('$.boolField', () => {
        expect(Shape.jsonPath(tree).boolField[Util.TreeFields.path]).toEqual("$['boolField']");
      });
      it('$.timestampField', () => {
        expect(Shape.jsonPath(tree).timestampField[Util.TreeFields.path]).toEqual("$['timestampField']");
      });
      it('$.stringArray', () => {
        expect(Shape.jsonPath(tree).stringArray[Util.TreeFields.path]).toEqual("$['stringArray']");
      });
      it('$.stringMap', () => {
        expect(Shape.jsonPath(tree).stringMap[Util.TreeFields.path]).toEqual("$['stringMap']");
      });
      it('$.struct', () => {
        expect(Shape.jsonPath(tree).struct[Util.TreeFields.path]).toEqual("$['struct']");
      });
      it('$.custom', () => {
        expect(Shape.jsonPath(tree).custom[Util.TreeFields.path]).toEqual("$['custom']");
      });
    });

    describe('array items', () => {
      it('$.stringArray[:0]', () => {
        expect(Shape.jsonPath(tree).stringArray.items[Util.TreeFields.path]).toEqual("$['stringArray'][:0]");
      });
      it('$.stringArray[:0]', () => {
        expect(Shape.jsonPath(tree).stringArray.map(item => item)[Util.TreeFields.path]).toEqual(Shape.jsonPath(tree).stringArray.items[Util.TreeFields.path]);
      });
      it('$.structArray[:0].item', () => {
        expect(Shape.jsonPath(tree).structArray.map(item => item.fields.item)[Util.TreeFields.path]).toEqual("$['structArray'][:0]['item']");
      });
      it('$.stringArray[0:2]', () => {
        expect(Shape.jsonPath(tree).stringArray.slice(0, 2)[Util.TreeFields.path]).toEqual("$['stringArray'][0:2]");
      });
      it('$.stringArray[0:10:2]', () => {
        expect(Shape.jsonPath(tree).stringArray.slice(0, 10, 2)[Util.TreeFields.path]).toEqual("$['stringArray'][0:10:2]");
      });
      it('$.structArray[0:2].item', () => {
        expect(Shape.jsonPath(tree).structArray.slice(0, 2).fields.item[Util.TreeFields.path]).toEqual("$['structArray'][0:2]['item']");
      });
    });

    describe('map values', () => {
      it('$.stringMap.key', () => {
        expect(Shape.jsonPath(tree).stringMap.get('key')[Util.TreeFields.path]).toEqual("$['stringMap']['key']");
      });
      it('$.structMap.key.item', () => {
        expect(Shape.jsonPath(tree).structMap.get('key').fields.item[Util.TreeFields.path]).toEqual("$['structMap']['key']['item']");
      });
    });

    describe('optional', () => {
      it('$.optionalArray.item', () => {
        expect(Shape.jsonPath(tree).optionalArray.items[Util.TreeFields.path]).toEqual("$['optionalArray'][:0]");
      });
    });
  });

  describe('custom types', () => {
    it('custom path', () => {
      expect(Shape.jsonPath(tree).custom.customOperation()[Util.TreeFields.path]).toEqual("$['custom']['arr'][0:1]");
    });
  });
});
