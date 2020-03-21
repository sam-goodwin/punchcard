import {Record, array, string} from "@punchcard/shape";

export class FirehoseRecord extends Record({
  data: string,
  recordId: string,
}) {}
export class FirehoseEvent extends Record({
  records: array(FirehoseRecord),
}) {}

export class FirehoseResponseRecord extends Record({
  data: string,
  recordId: string,
  result: string,
}) {
  // @ts-ignore
  result: ValidationResult;
}
export class FirehoseResponse extends Record({
  records: array(FirehoseResponseRecord),
}) {}

export enum ValidationResult {
  Dropped = "Dropped",
  Ok = "Ok",
  ProcessingFailed = "ProcessingFailed",
}
