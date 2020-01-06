import 'jest';

import { Query } from '../lib';
import { MyType } from './mock';

const underTest = Query.dsl(MyType).Fields;
it('should', () => {
  underTest.id.equals('value');
  underTest.id.equals(underTest.map.get('key'));
  underTest.id.equals(underTest.complexMap.get('key').Fields.a);

  underTest.complexMap.get('key').equals({
    a: 'value'
  });
  underTest.map.get('key').equals(underTest.id);
  underTest.map.get('key').equals('some value');
  underTest.map.equals({
    key: 'string'
  });
  underTest.map.equals(underTest.map);

  underTest.array.get(1).equals('string');
  underTest.array.get(underTest.count).equals('string');
  underTest.array.equals(['a', 'b']);
  underTest.array.equals(underTest.array);
});
