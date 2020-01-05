import 'jest';

import { bool, string } from '@punchcard/shape';

import { Query } from '../lib';
import { MyType } from './mock';

const underTest = Query.dsl(MyType);

it('should', () => {
  expect(underTest.fields.id.between('lower', 'upper')).toEqual({
    lhs: {
      [Query.NodeType]: "expression",
      [Query.ExpressionNodeType]: "instance",
      [Query.ExpressionType]: string
    },
    lowerBound: "lower",
    upperBound: "upper",
    [Query.NodeType]: "expression",
    [Query.ExpressionNodeType]: "between",
    [Query.ExpressionType]: bool
  });
});