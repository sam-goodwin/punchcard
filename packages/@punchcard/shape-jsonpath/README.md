# @punchcard/shape-jsonpath

This library extends the Punchcard Shape Type-System with support for a type-safe JSON path generator.

# Define a Type
```ts
// a record to be used within our top-level type (i.e. a nested structure).
export class Nested extends Type({
  /**
   * This is a nested string.
   */
  a: string
}) {}

// the type we will query with JSON path
export class MyType extends Type({
  /**
   * Field documentation.
   */
  id: string,
  count: number,
  array: array(string),
  complexArray: array(Nested),
  map: map(string),
  complexMap: map(Nested)
}) {}
```

# Derive a JSON Path DSL from the type
```ts
const _ = JsonPath.of(MyType);
```

# Create a JSON Path
`_` is a type-safe DSL with members and operators that correspond to a JSON path expressions.

Use `JsonPath.compile(expr)` to compile the abstract JSON path to its string representation. E.g `JsonPath.compile(_.id) === "$['id']"`.

## Access a member
```ts
_.id; // $['id']
```

## Filter items in array

```ts
_.array.filter(_ => _.equals('value')); // $['array'][?(@=='value')]
_.complexArray.filter(_ => _.a.equals('value')); // $['complexArray'][?(@['a']=='value')]
```

## Access a map's value

```ts
_.map.item; // $['map']['item']
_.map.get('item'); // $['map']['item']
```

## Filter a map by value
```ts
_.map.filter(_ => _.equals('value')); // $['map'][?(@=='value')]
_.complexMap.filter(_ => _.a.equals('value'); // $['complexMap'][?(@['a']=='value')]
```
