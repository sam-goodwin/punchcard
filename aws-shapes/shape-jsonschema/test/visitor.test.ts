import {
  Optional,
  Record,
  any,
  binary,
  nothing,
  number,
  optional,
  string,
} from "@punchcard/shape";
import {
  MaxLength,
  Maximum,
  MinLength,
  Minimum,
  MultipleOf,
  Pattern,
} from "@punchcard/shape";
import {array, map, set} from "@punchcard/shape/lib/collection";
import {JsonSchema, NumberSchema} from "../lib";

class Nested extends Record({
  a: optional(string),
}) {}

class MyType extends Record({
  /**
   * Field documentation.
   */
  any,
  array: array(string),
  binary: binary.apply(MaxLength(1)),
  complexArray: array(Nested),
  complexMap: map(Nested).apply(Optional),
  complexSet: set(Nested),
  count: number
    .apply(Maximum(1))
    .apply(Minimum(1, true))
    .apply(MultipleOf(2)),
  id: string
    .apply(MaxLength(1))
    .apply(MinLength(0))
    .apply(Pattern(".*")),
  map: map(string),

  nested: Nested,

  nothing,

  set: set(string),
}) {}

// "stamp" an interface representing the JSON schema of MyType - sick code generation!
type MyTypeJsonSchema = JsonSchema.Of<typeof MyType>;

const schema: MyTypeJsonSchema = JsonSchema.of(MyType);
function requireEven(schema: NumberSchema<{multipleOf: 2}>) {
  // no-op
}
requireEven(schema.properties.count);

test("should render JSON schema", () => {
  expect(schema).toStrictEqual({
    properties: {
      any: {
        type: {},
      },
      array: {
        items: {
          type: "string",
        },
        type: "array",
        uniqueItems: false,
      },
      binary: {
        format: "base64",
        maxLength: 1,
        type: "string",
      },
      complexArray: {
        items: {
          properties: {
            a: {
              type: "string",
            },
          },
          type: "object",
        },
        type: "array",
        uniqueItems: false,
      },
      complexMap: {
        additionalProperties: {
          properties: {
            a: {
              type: "string",
            },
          },
          type: "object",
        },
        allowAdditionalProperties: true,
        properties: {},
        type: "object",
      },
      complexSet: {
        items: {
          properties: {
            a: {
              type: "string",
            },
          },
          type: "object",
        },
        type: "array",
        uniqueItems: true,
      },
      count: {
        exclusiveMaximum: false,
        exclusiveMinimum: true,
        maximum: 1,
        minimum: 1,
        multipleOf: 2,
        type: "number",
      },
      id: {
        maxLength: 1,
        minLength: 0,
        pattern: ".*",
        type: "string",
      },
      map: {
        additionalProperties: {
          type: "string",
        },
        allowAdditionalProperties: true,
        properties: {},
        type: "object",
      },
      nested: {
        properties: {
          a: {
            type: "string",
          },
        },
        type: "object",
      },
      nothing: {
        type: "null",
      },
      set: {
        items: {
          type: "string",
        },
        type: "array",
        uniqueItems: true,
      },
    },
    required: [
      "id",
      "count",
      "nested",
      "array",
      "complexArray",
      "set",
      "complexSet",
      "map",
      "binary",
      "any",
      "nothing",
    ],
    type: "object",
  });

  // how fking awesome is it that the type-signature is the same as the value ^^
  const expected: {
    properties: {
      any: {
        type: {};
      };
      array: {
        items: {
          type: "string";
        };
        type: "array";
        uniqueItems?: false;
      };
      binary: {
        format: "base64";
        maxLength: 1;
        type: "string";
      };
      complexArray: {
        items: {
          properties: {
            a: {
              type: "string";
            };
          };
          type: "object";
        };
        type: "array";
        uniqueItems?: false;
      };
      complexMap: {
        additionalProperties: {
          properties: {
            a: {
              type: "string";
            };
          };
          type: "object";
        };
        allowAdditionalProperties: true;
        properties: {};
        type: "object";
      };
      complexSet: {
        items: {
          properties: {
            a: {
              type: "string";
            };
          };
          type: "object";
        };
        type: "array";
        uniqueItems: true;
      };
      count: {
        exclusiveMaximum: false;
        exclusiveMinimum: true;
        maximum: 1;
        minimum: 1;
        multipleOf: 2;
        type: "number";
      };
      id: {
        maxLength: 1;
        minLength: 0;
        pattern: ".*";
        type: "string";
      };
      map: {
        additionalProperties: {
          type: "string";
        };
        allowAdditionalProperties: true;
        properties: {};
        type: "object";
      };
      nested: {
        properties: {
          a: {
            type: "string";
          };
        };
        type: "object";
      };
      nothing: {
        type: "null";
      };
      set: {
        items: {
          type: "string";
        };
        type: "array";
        uniqueItems: true;
      };
    };
    required: string[];
    type: "object";
  } = schema;
});
