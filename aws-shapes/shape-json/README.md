# @punchcard/shape-json

Provides JSON serialization and deserialization for Punchcard Shapes.

# Create a Record

```ts
class MyType extends Record({
  key: string
    .apply(MinLength(1)), // apply constraints with Traits
  count: integer
    .apply(Minimum(0)),
  rating: number,
  array: array(string),
  map: map(string)
}) {}
```

# Derive a Mapper from `MyType`

```ts
import { Json } from '@punchcard/shape-json';

const mapper = Json.mapper(MyType);
```

# Serialize a type as JSON

```ts
const json = mapper.write(new MyType({ ... }));
```

# Deserialize from JSON

```ts
const json: Json.Of<MyType> = ...;
const myType: MyType = mapper.read(json);
```

# Derive a type for the JSON form of a Shape
Given a Shape, you can retrieve the serialzied JSON type from it:
```ts
const json: Json.Of<MyType> = {
  // statically checked JSON

  key: 'must be a string',
  count: 1,
  rating: 1.1,
  array: ['array', 'of', 'strings'],
  map: {
    key: 'map of string value'
  }
};
```