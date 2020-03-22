import {HashSet, MaxLength, Record} from "@punchcard/shape";
import {MyType, Nested} from "./mock";
import {binary, string} from "@punchcard/shape/lib/primitive";
import {Mapper} from "../lib";

const underTest = Mapper.of(MyType);

describe("mapper", () => {
  it("should read attribute values", () => {
    expect.assertions(1);
    const complexValue = {
      M: {
        a: {
          S: "complex value",
        },
      },
    };

    const actual = underTest.read({
      M: {
        anyField: {
          S: "any",
        },
        array: {
          L: [
            {
              S: "array value",
            },
          ],
        },
        binaryField: {
          B: Buffer.from("binaryField", "utf8"),
        },
        binarySet: {
          BS: [Buffer.from("binarySet", "utf8")], // test de-dupe
        },
        bool: {
          BOOL: true,
        },
        complexArray: {
          L: [complexValue],
        },
        complexMap: {
          M: {
            key: complexValue,
          },
        },
        id: {
          S: "id",
        },
        integer: {
          N: "1",
        },
        map: {
          M: {
            key: {
              S: "value",
            },
          },
        },
        nested: {
          M: {
            a: {
              S: "nested value",
            },
          },
        },
        numberSet: {
          NS: ["1", "2"],
        },
        stringSet: {
          SS: ["1", "2"],
        },
        ts: {
          S: new Date(0).toUTCString(),
        },
        unknownField: {
          N: "1",
        },
      },
    });

    const expected: typeof actual = new MyType({
      anyField: "any",
      array: ["array value"],
      binaryField: Buffer.from("binaryField", "utf8"),
      binarySet: HashSet.of(binary).add(Buffer.from("binarySet", "utf8")),
      bool: true,
      complexArray: [
        new Nested({
          a: "complex value",
        }),
      ],
      complexMap: {
        key: new Nested({
          a: "complex value",
        }),
      },
      id: "id",
      integer: 1,
      map: {
        key: "value",
      },
      nested: new Nested({
        a: "nested value",
      }),
      numberSet: new Set([1, 2]),
      stringSet: new Set(["1", "2"]),
      ts: new Date(0),
      unknownField: 1,
    });

    expect(actual).toStrictEqual(expected);
  });

  class T extends Record({
    id: string.apply(MaxLength(1)),
  }) {}

  it("should validate", () => {
    expect.assertions(1);
    const m = Mapper.of(T);

    expect(() =>
      m.read({
        M: {
          id: {
            S: "01",
          },
        },
      }),
    ).toThrow("expected string with length <= 1, but received: 01");
  });

  it("should support empty record", () => {
    expect.assertions(1);
    class Empty extends Record({}) {}
    expect(() => Mapper.of(Empty)).not.toThrow();
  });
});
