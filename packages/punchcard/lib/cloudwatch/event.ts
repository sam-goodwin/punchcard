import { any, array, string, Type } from "@punchcard/shape";

export namespace Event {
  export class Payload extends Type({
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
