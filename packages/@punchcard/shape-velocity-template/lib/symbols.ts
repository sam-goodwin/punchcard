const namespace = '@punchcard/shape-velocity-templates';

export const ExpressionShape = Symbol.for(`${namespace}.ExpressionShape`);
export const Instance = Symbol.for(`${namespace}.Instance`);
export const ItemShape = Symbol.for(`${namespace}.ItemShape`);
export const NodeType = Symbol.for(`${namespace}.NodeType`);
export const ObjectExpression = Symbol.for(`${namespace}.ObjectExpression`);
export const StatementType = Symbol.for(`${namespace}.StatementType`);
export const VisitNode = Symbol.for(`${namespace}.VisitNode`);
export type ExpressionShape = typeof ExpressionShape;
export type Instance = typeof Instance;
export type ItemShape = typeof ItemShape;
export type NodeType = typeof NodeType;
export type ObjectExpression = typeof ObjectExpression;
export type StatementType = typeof StatementType;
export type VisitNode = typeof VisitNode;