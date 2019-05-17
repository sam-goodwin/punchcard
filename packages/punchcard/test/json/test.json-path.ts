import 'jest';

import { BaseDynamoPath, DynamoPath } from '../../lib/dynamodb';
import {
  array,
  boolean,
  CustomPath,
  CustomType,
  float,
  integer,
  JsonPath,
  jsonPath,
  map,

  optional,
  string,
  struct,
  timestamp
} from '../../lib/shape';
import { TreeFields } from '../../lib/tree';

export function custom(): Custom {
  return new Custom();
}
export class Custom extends CustomType<Custom.Shape> {
  constructor() {
    super(Custom.shape);
  }

  public toDynamoPath(parent: DynamoPath, name: string): any {
    return new BaseDynamoPath(parent, name, this);
  }

  public toJsonPath(parent: JsonPath<any>, name: string): Custom.Path {
    return new Custom.Path(parent, name, this);
  }
}
export namespace Custom {
  export type Shape = typeof shape;
  export const shape = {
    id: string(),
    arr: array(string())
  };
  export class Path extends CustomPath<Shape, Custom> {
    public customOperation() {
      return this.fields.arr.slice(0, 1);
    }
  }
  // export class DynamoPath extends CustomPath<Shape, Custom> {
  //   public customOperation() {
  //     return this.fields.arr.slice(0, 1);
  //   }
  // }
}

const tree = {
  stringField: string(),
  intField: integer(),
  numberField: float(),
  boolField: boolean,
  timestampField: timestamp,
  stringArray: array(string()),
  structArray: array(struct({
    item: string()
  })),

  stringMap: map(string()),
  structMap: map(struct({
    item: string()
  })),

  optionalArray: optional(array(string())),

  custom: custom(),

  struct: struct({
    stringField: string(),
    intField: integer(),
    numberField: float(),
    boolField: boolean,

    stringArray: array(string()),
    intArray: array(integer()),
    numberArray: array(float()),
    boolArray: array(boolean),

    stringMap: map(string()),
    intMap: map(integer()),
    numberMap: map(float()),
    boolMap: map(boolean),
  })
};

describe('json', () => {
  describe('path', () => {
    describe('child', () => {
      it('$.stringField', () => {
        expect(jsonPath(tree).stringField[TreeFields.path]).toEqual("$['stringField']");
      });
      it('$.intField', () => {
        expect(jsonPath(tree).intField[TreeFields.path]).toEqual("$['intField']");
      });
      it('$.numberField', () => {
        expect(jsonPath(tree).numberField[TreeFields.path]).toEqual("$['numberField']");
      });
      it('$.boolField', () => {
        expect(jsonPath(tree).boolField[TreeFields.path]).toEqual("$['boolField']");
      });
      it('$.timestampField', () => {
        expect(jsonPath(tree).timestampField[TreeFields.path]).toEqual("$['timestampField']");
      });
      it('$.stringArray', () => {
        expect(jsonPath(tree).stringArray[TreeFields.path]).toEqual("$['stringArray']");
      });
      it('$.stringMap', () => {
        expect(jsonPath(tree).stringMap[TreeFields.path]).toEqual("$['stringMap']");
      });
      it('$.struct', () => {
        expect(jsonPath(tree).struct[TreeFields.path]).toEqual("$['struct']");
      });
      it('$.custom', () => {
        expect(jsonPath(tree).custom[TreeFields.path]).toEqual("$['custom']");
      });
    });

    describe('array items', () => {
      it('$.stringArray[:0]', () => {
        expect(jsonPath(tree).stringArray.items[TreeFields.path]).toEqual("$['stringArray'][:0]");
      });
      it('$.stringArray[:0]', () => {
        expect(jsonPath(tree).stringArray.map(item => item)[TreeFields.path]).toEqual(jsonPath(tree).stringArray.items[TreeFields.path]);
      });
      it('$.structArray[:0].item', () => {
        expect(jsonPath(tree).structArray.map(item => item.fields.item)[TreeFields.path]).toEqual("$['structArray'][:0]['item']");
      });
      it('$.stringArray[0:2]', () => {
        expect(jsonPath(tree).stringArray.slice(0, 2)[TreeFields.path]).toEqual("$['stringArray'][0:2]");
      });
      it('$.stringArray[0:10:2]', () => {
        expect(jsonPath(tree).stringArray.slice(0, 10, 2)[TreeFields.path]).toEqual("$['stringArray'][0:10:2]");
      });
      it('$.structArray[0:2].item', () => {
        expect(jsonPath(tree).structArray.slice(0, 2).fields.item[TreeFields.path]).toEqual("$['structArray'][0:2]['item']");
      });
    });

    describe('map values', () => {
      it('$.stringMap.key', () => {
        expect(jsonPath(tree).stringMap.get('key')[TreeFields.path]).toEqual("$['stringMap']['key']");
      });
      it('$.structMap.key.item', () => {
        expect(jsonPath(tree).structMap.get('key').fields.item[TreeFields.path]).toEqual("$['structMap']['key']['item']");
      });
    });

    describe('optional', () => {
      it('$.optionalArray.item', () => {
        expect(jsonPath(tree).optionalArray.items[TreeFields.path]).toEqual("$['optionalArray'][:0]");
      });
    });
  });

  describe('custom types', () => {
    it('custom path', () => {
      expect(jsonPath(tree).custom.customOperation()[TreeFields.path]).toEqual("$['custom']['arr'][0:1]");
    });
  });
});
