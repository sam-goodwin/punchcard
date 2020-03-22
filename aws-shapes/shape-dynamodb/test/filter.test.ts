import {Condition, DSL} from "../lib";
import {MyType} from "./mock";

const _ = DSL.of(MyType);

describe("filter", () => {
  it("stringProperty = stringLiteral", () => {
    expect.assertions(1);
    expect(Condition.compile(_.id.equals("value"))).toStrictEqual({
      Expression: "#1=:1",
      ExpressionAttributeNames: {
        "#1": "id",
      },
      ExpressionAttributeValues: {
        ":1": {
          S: "value",
        },
      },
    });
  });

  it("stringProperty BETWEEN a AND b", () => {
    expect.assertions(1);
    expect(Condition.compile(_.id.between("a", "b"))).toStrictEqual({
      Expression: "#1 BETWEEN :1 AND :2",
      ExpressionAttributeNames: {
        "#1": "id",
      },
      ExpressionAttributeValues: {
        ":1": {S: "a"},
        ":2": {S: "b"},
      },
    });
  });

  it("array[index] = stringiteral", () => {
    expect.assertions(1);
    expect(Condition.compile(_.array[0].equals("string"))).toStrictEqual({
      Expression: "#1[0]=:1",
      ExpressionAttributeNames: {
        "#1": "array",
      },
      ExpressionAttributeValues: {
        ":1": {
          S: "string",
        },
      },
    });
  });

  it("struct.field = stringLiteral", () => {
    expect.assertions(1);
    expect(Condition.compile(_.nested.fields.a.equals("string"))).toStrictEqual(
      {
        Expression: "#1.#2=:1",
        ExpressionAttributeNames: {
          "#1": "nested",
          "#2": "a",
        },
        ExpressionAttributeValues: {
          ":1": {
            S: "string",
          },
        },
      },
    );
  });

  it("struct.field = array.get(index)", () => {
    expect.assertions(1);
    expect(
      Condition.compile(_.nested.fields.a.equals(_.array.get(0))),
    ).toStrictEqual({
      Expression: "#1.#2=#3[0]",
      ExpressionAttributeNames: {
        "#1": "nested",
        "#2": "a",
        "#3": "array",
      },
    });
  });
});
