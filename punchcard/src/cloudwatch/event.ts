import {Record, any, array, string} from "@punchcard/shape";

export namespace Event {
  export class Payload extends Record({
    account: string,
    detail: any,
    "detail-type": string,
    id: string,
    region: string,
    resources: array(string),
    source: string,
    time: string,
  }) {}
}
