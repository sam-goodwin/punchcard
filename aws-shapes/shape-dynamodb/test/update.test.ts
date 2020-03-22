import {DSL} from "../lib";
import {MyType} from "./mock";
import {Update} from "../lib/update";

const _ = DSL.of(MyType);

describe("update", () => {
  it("stringProperty = stringLiteral", () => {
    expect.assertions(1);
    expect(Update.compile([_.id.set("value")])).toStrictEqual({
      ExpressionAttributeNames: {
        "#1": "id",
      },
      ExpressionAttributeValues: {
        ":1": {
          S: "value",
        },
      },
      UpdateExpression: "SET #1=:1",
    });
  });

  it("repeated clauses", () => {
    expect.assertions(1);
    expect(
      Update.compile([_.id.set("value"), _.id.set("value")]),
    ).toStrictEqual({
      ExpressionAttributeNames: {
        "#1": "id",
      },
      ExpressionAttributeValues: {
        ":1": {
          S: "value",
        },
        ":2": {
          S: "value",
        },
      },
      UpdateExpression: "SET #1=:1, #1=:2",
    });
  });

  it("list-push", () => {
    expect.assertions(1);
    expect(Update.compile([_.array.push("value")])).toStrictEqual({
      ExpressionAttributeNames: {
        "#1": "array",
      },
      ExpressionAttributeValues: {
        ":1": {
          S: "value",
        },
      },
      UpdateExpression: "SET #1[1]=:1",
    });
  });

  it("list-append", () => {
    expect.assertions(1);
    expect(Update.compile([_.array.concat(["value"])])).toStrictEqual({
      ExpressionAttributeNames: {
        "#1": "array",
      },
      ExpressionAttributeValues: {
        ":1": {
          L: [
            {
              S: "value",
            },
          ],
        },
      },
      UpdateExpression: "SET #1=list_append(#1,:1)",
    });
  });

  it("increment", () => {
    expect.assertions(1);
    expect(Update.compile([_.count.increment()])).toStrictEqual({
      ExpressionAttributeNames: {
        "#1": "count",
      },
      ExpressionAttributeValues: {
        ":1": {
          N: "1",
        },
      },
      UpdateExpression: "SET #1=#1+:1",
    });
  });
});
