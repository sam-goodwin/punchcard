import { any, array, Record, string } from "@punchcard/shape";

export namespace Event {
  export class Payload extends Record({
    "account": string,
    "region": string,
    "detail": any,
    'detail-type': string,
    "source": string,
    "time": string,
    "id": string,
    "resources": array(string)
  }) {}
}
