import 'jest';

import { Shape, Util } from '../../lib';
import { Value } from '../../lib/shape/instance';

// tslint:disable: member-access

class TestType {
  stringField = Shape.string();
  intField = Shape.integer();
  numberField = Shape.float();
  boolField = Shape.boolean;
  timestampField = Shape.timestamp;
  stringArray = Shape.array(Shape.string());

  structArray = Shape.array(Shape.struct(TestItemType));
  stringMap = Shape.map(Shape.string());
  structMap = Shape.map(Shape.struct(TestItemType));
  struct = Shape.struct(NestedType);

  optionalArray = Shape.optional(Shape.array(Shape.string()));
}

class TestItemType {
  item = Shape.string();
}

class NestedType {
  stringField = Shape.string();
  intField = Shape.integer();
  numberField = Shape.float();
  boolField = Shape.boolean;

  stringArray = Shape.array(Shape.string());
  intArray = Shape.array(Shape.integer());
  numberArray = Shape.array(Shape.float());
  boolArray = Shape.array(Shape.boolean);

  stringMap = Shape.map(Shape.string());
  intMap = Shape.map(Shape.integer());
  numberMap = Shape.map(Shape.float());
  boolMap = Shape.map(Shape.boolean);
}

describe('json', () => {
  describe('path', () => {
    describe('child', () => {
      it('$.stringField', () => {
        expect(Shape.jsonPath(TestType).stringField[Util.TreeFields.path]).toEqual("$['stringField']");
      });
      it('$.intField', () => {
        expect(Shape.jsonPath(TestType).intField[Util.TreeFields.path]).toEqual("$['intField']");
      });
      it('$.numberField', () => {
        expect(Shape.jsonPath(TestType).numberField[Util.TreeFields.path]).toEqual("$['numberField']");
      });
      it('$.boolField', () => {
        expect(Shape.jsonPath(TestType).boolField[Util.TreeFields.path]).toEqual("$['boolField']");
      });
      it('$.timestampField', () => {
        expect(Shape.jsonPath(TestType).timestampField[Util.TreeFields.path]).toEqual("$['timestampField']");
      });
      it('$.stringArray', () => {
        expect(Shape.jsonPath(TestType).stringArray[Util.TreeFields.path]).toEqual("$['stringArray']");
      });
      it('$.stringMap', () => {
        expect(Shape.jsonPath(TestType).stringMap[Util.TreeFields.path]).toEqual("$['stringMap']");
      });
      it('$.struct', () => {
        expect(Shape.jsonPath(TestType).struct[Util.TreeFields.path]).toEqual("$['struct']");
      });
    });

    describe('array items', () => {
      it('$.stringArray[:0]', () => {
        expect(Shape.jsonPath(TestType).stringArray.items[Util.TreeFields.path]).toEqual("$['stringArray'][:0]");
      });
      it('$.stringArray[:0]', () => {
        expect(Shape.jsonPath(TestType).stringArray.map(item => item)[Util.TreeFields.path]).toEqual(Shape.jsonPath(TestType).stringArray.items[Util.TreeFields.path]);
      });
      it('$.structArray[:0].item', () => {
        expect(Shape.jsonPath(TestType).structArray.map(item => item.fields.item)[Util.TreeFields.path]).toEqual("$['structArray'][:0]['item']");
      });
      it('$.stringArray[0:2]', () => {
        expect(Shape.jsonPath(TestType).stringArray.slice(0, 2)[Util.TreeFields.path]).toEqual("$['stringArray'][0:2]");
      });
      it('$.stringArray[0:10:2]', () => {
        expect(Shape.jsonPath(TestType).stringArray.slice(0, 10, 2)[Util.TreeFields.path]).toEqual("$['stringArray'][0:10:2]");
      });
      it('$.structArray[0:2].item', () => {
        expect(Shape.jsonPath(TestType).structArray.slice(0, 2).fields.item[Util.TreeFields.path]).toEqual("$['structArray'][0:2]['item']");
      });
    });

    describe('map values', () => {
      it('$.stringMap.key', () => {
        expect(Shape.jsonPath(TestType).stringMap.get('key')[Util.TreeFields.path]).toEqual("$['stringMap']['key']");
      });
      it('$.structMap.key.item', () => {
        expect(Shape.jsonPath(TestType).structMap.get('key').fields.item[Util.TreeFields.path]).toEqual("$['structMap']['key']['item']");
      });
    });

    describe('optional', () => {
      it('$.optionalArray.item', () => {
        expect(Shape.jsonPath(TestType).optionalArray.items[Util.TreeFields.path]).toEqual("$['optionalArray'][:0]");
      });
    });
  });
});
