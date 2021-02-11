# @punchcard/shape-jsonschema

This library maps types in the Punchcard Shape type-system to a JSON Schema.

# Defining Types

First, create a Type using the Shape type-sytem:
```ts
class MyType extends Type({
  key: string
    .apply(MinLength(1)),
  count: integer
    .apply(Minimum(0)),
  rating: number,
  array: array(string),
  map: map(string),
  set: set(string)
}) {}
```

# Map the record to a JSON schema document

```ts
const schema = require('@punchcard/shape-jsonschema').JsonSchema.of(MyType);
```

The type (and value) of the JSON schema is dynamically created and retains all constraint information:

```ts
const schema: {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      maxLength: 1
    },
    count: {
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: false
    },
    rating: {
      type: 'number'
    },
    array: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    set: {
      type: 'array',
      items: {
        type: 'string'
      },
      uniqueItems: true
    },
    map: {
      type: 'object',
      properties: {},
      allowAdditionalProperties: true,
      additionalProperties: {
        type: 'string'
      }
    },
  }
} = JsonSchema.of(MyType);
```

The only data that can not be retained is the `required` property since it is not possible to map union types to tuples. The value would have those keys that are not annotated with `Optional`.