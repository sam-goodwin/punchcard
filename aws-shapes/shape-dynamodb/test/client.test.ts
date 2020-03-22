import {Record, any, array, map, number, string} from "@punchcard/shape";
import {TableClient} from "../lib/client";
import sinon from "sinon";

class Type extends Record({
  count: number,
  dict: map(string),
  dynamic: any,
  key: string,
  list: array(string),
}) {}

const hashTable = new TableClient({
  data: Type,
  key: {
    partition: "key",
  },
  tableName: "my-table-name",
});

const sortedTable = new TableClient({
  data: Type,
  key: {
    partition: "key",
    sort: "count",
  },
  tableName: "my-table-name",
});
// leaving this here as a compile time test for now

function mockClient(fake: {[K in keyof AWS.DynamoDB]?: sinon.SinonSpy}) {
  (sortedTable as any).client = fake;
  (hashTable as any).client = fake;
  return fake;
}

describe("client", () => {
  it("getItem", async () => {
    expect.assertions(4);
    const getItemPromise = sinon.fake.resolves({
      Item: {
        count: {N: "1"},
        dict: {M: {key: {S: "string"}}},
        dynamic: {S: "value"},
        key: {S: "value"},
        list: {L: [{S: "list value"}]},
      },
    });
    const getItem = sinon.fake.returns({promise: getItemPromise});
    const client = mockClient({
      getItem,
    });

    const hkResult = await hashTable.get({key: "value"});
    const skResult = await sortedTable.get({count: 1, key: "value"});

    expect(hkResult).toStrictEqual(skResult);
    expect(skResult).toStrictEqual(
      new Type({
        count: 1,
        dict: {key: "string"},
        dynamic: "value",
        key: "value",
        list: ["list value"],
      }),
    );

    expect(getItem.args[0][0]).toStrictEqual({
      Key: {
        key: {S: "value"},
      },
      TableName: "my-table-name",
    });
    expect(getItem.args[1][0]).toStrictEqual({
      Key: {
        count: {N: "1"},
        key: {S: "value"},
      },
      TableName: "my-table-name",
    });
  });

  it("put-if", async () => {
    expect.assertions(1);
    const putItemPromise = sinon.fake.resolves(null as any);
    const putItem = sinon.fake.returns({promise: putItemPromise});
    const client = mockClient({
      putItem,
    });

    await sortedTable.put(
      new Type({
        count: 1,
        dict: {
          key: "value",
        },
        dynamic: "dynamic-value",
        key: "key",
        list: ["a", "b"],
      }),
      {
        if: (_) =>
          _.count
            .equals(1)
            .and(_.list[0].lessThanOrEqual(0))
            .and(_.dict.get("a").equals("value")),
      },
    );

    expect(putItem.args[0][0]).toStrictEqual({
      ConditionExpression: "((#1=:1 AND #2[0]<=:2) AND #3.#4=:3)",
      ExpressionAttributeNames: {
        "#1": "count",
        "#2": "list",
        "#3": "dict",
        "#4": "a",
      },
      ExpressionAttributeValues: {
        ":1": {N: "1"},
        ":2": {N: "0"},
        ":3": {S: "value"},
      },
      Item: {
        count: {N: "1"},
        dict: {M: {key: {S: "value"}}},
        dynamic: {S: "dynamic-value"},
        key: {S: "key"},
        list: {L: [{S: "a"}, {S: "b"}]},
      },
      TableName: "my-table-name",
    });
  });

  it("update", async () => {
    expect.assertions(1);
    const updateItemPromise = sinon.fake.resolves(undefined as any);
    const updateItem = sinon.fake.returns({promise: updateItemPromise});
    mockClient({
      updateItem,
    });

    await sortedTable.update(
      {
        count: 1,
        key: "key",
      },
      {
        actions: (item) => [
          item.list.push("item"),
          item.dynamic.as(string).set("dynamic-value"),
          item.count.set(item.count.plus(1)),
          item.count.increment(),
        ],
      },
    );

    expect(updateItem.args[0][0]).toStrictEqual({
      ExpressionAttributeNames: {
        "#1": "list",
        "#2": "dynamic",
        "#3": "count",
      },
      ExpressionAttributeValues: {
        ":1": {S: "item"},
        ":2": {S: "dynamic-value"},
        ":3": {N: "1"},
        ":4": {N: "1"},
      },
      Key: {
        count: {N: "1"},
        key: {S: "key"},
      },
      TableName: "my-table-name",
      UpdateExpression: "SET #1[1]=:1, #2=:2, #3=#3+:3, #3=#3+:4",
    });
  });

  it("update-if", async () => {
    expect.assertions(1);
    const updateItemPromise = sinon.fake.resolves(null as any);
    const updateItem = sinon.fake.returns({promise: updateItemPromise});
    mockClient({
      updateItem,
    });

    await sortedTable.update(
      {
        count: 1,
        key: "key",
      },
      {
        actions: (item) => [
          item.list.push("item"),
          item.dynamic.as(string).set("dynamic-value"),
          item.count.set(item.count.plus(1)),
          item.count.increment(),
        ],
        if: (item) => item.key.exists(),
      },
    );

    expect(updateItem.args[0][0]).toStrictEqual({
      ConditionExpression: "attribute_exists(#4)",
      ExpressionAttributeNames: {
        "#1": "list",
        "#2": "dynamic",
        "#3": "count",
        "#4": "key",
      },
      ExpressionAttributeValues: {
        ":1": {S: "item"},
        ":2": {S: "dynamic-value"},
        ":3": {N: "1"},
        ":4": {N: "1"},
      },
      Key: {
        count: {N: "1"},
        key: {S: "key"},
      },
      TableName: "my-table-name",
      UpdateExpression: "SET #1[1]=:1, #2=:2, #3=#3+:3, #3=#3+:4",
    });
  });

  it("query", async () => {
    expect.assertions(1);
    const queryPromise = sinon.fake.resolves({});
    const query = sinon.fake.returns({promise: queryPromise});
    mockClient({
      query,
    });

    await sortedTable.query({
      count: (_) => _.greaterThan(0),
      key: "key",
    });

    expect(query.args[0][0]).toStrictEqual({
      ExpressionAttributeNames: {
        "#1": "key",
        "#2": "count",
      },
      ExpressionAttributeValues: {
        ":1": {S: "key"},
        ":2": {N: "0"},
      },
      KeyConditionExpression: "(#1=:1 AND #2>:2)",
      TableName: "my-table-name",
    });
  });
});
