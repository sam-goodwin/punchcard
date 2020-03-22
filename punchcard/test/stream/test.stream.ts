import core = require("@aws-cdk/core");
import sinon = require("sinon");
import {string} from "@punchcard/shape";
import {Kinesis} from "../../src";
import {Build} from "../../src/core/build";

describe("client", () => {
  describe("sink", () => {
    it("should sink all messages", async () => {
      const stream = new Kinesis.Stream(
        Build.of(new core.Stack(new core.App({autoSynth: false}), "stack")),
        "stream",
        {
          partitionBy: () => "p",
          shape: string,
        },
      );
      const mockClient = {
        putRecords: sinon.fake.returns({
          promise: () =>
            Promise.resolve({
              FailedRecordCount: 0,
            }),
        }),
      };
      const client = new Kinesis.Client(
        stream,
        "streamName",
        mockClient as any,
      );

      await client.sink(["1"]);

      expect(mockClient.putRecords.calledOnce).toBe(true);
      expect(mockClient.putRecords.args[0]).toStrictEqual([
        {
          Records: [
            {
              Data: Buffer.from('"1"', "utf8"),
              PartitionKey: "p",
            },
          ],
          StreamName: "streamName",
        },
      ]);
    });
    it("should divide and conquer evenly", async () => {
      const stream = new Kinesis.Stream(
        Build.of(new core.Stack(new core.App({autoSynth: false}), "stack")),
        "stream",
        {
          partitionBy: () => "p",
          shape: string,
        },
      );
      const mockClient = {
        putRecords: sinon.fake.returns({
          promise: () =>
            Promise.resolve({
              FailedRecordCount: 0,
            }),
        }),
      };
      const client = new Kinesis.Client(
        stream,
        "streamName",
        mockClient as any,
      );

      await client.sink(Array(600).fill("1"));

      expect(mockClient.putRecords.calledTwice).toBe(true);
      expect(mockClient.putRecords.args[0]).toStrictEqual([
        {
          Records: Array(300).fill({
            Data: Buffer.from('"1"', "utf8"),
            PartitionKey: "p",
          }),
          StreamName: "streamName",
        },
      ]);
      expect(mockClient.putRecords.args[1]).toStrictEqual([
        {
          Records: Array(300).fill({
            Data: Buffer.from('"1"', "utf8"),
            PartitionKey: "p",
          }),
          StreamName: "streamName",
        },
      ]);
    });
    it("should divide and conquer oddly", async () => {
      const stream = new Kinesis.Stream(
        Build.of(new core.Stack(new core.App({autoSynth: false}), "stack")),
        "stream",
        {
          partitionBy: () => "p",
          shape: string,
        },
      );
      const mockClient = {
        putRecords: sinon.fake.returns({
          promise: () =>
            Promise.resolve({
              FailedRecordCount: 0,
            }),
        }),
      };
      const client = new Kinesis.Client(
        stream,
        "streamName",
        mockClient as any,
      );

      await client.sink(Array(599).fill("1"));

      expect(mockClient.putRecords.calledTwice).toBe(true);
      expect(mockClient.putRecords.args[0]).toStrictEqual([
        {
          Records: Array(299).fill({
            Data: Buffer.from('"1"', "utf8"),
            PartitionKey: "p",
          }),
          StreamName: "streamName",
        },
      ]);
      expect(mockClient.putRecords.args[1]).toStrictEqual([
        {
          Records: Array(300).fill({
            Data: Buffer.from('"1"', "utf8"),
            PartitionKey: "p",
          }),
          StreamName: "streamName",
        },
      ]);
    });
  });
});
