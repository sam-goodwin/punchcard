import { array, Record, string } from "@punchcard/shape";

export class FirehoseRecord extends Record({
  recordId: string,
  data: string
}) {}
export class FirehoseEvent extends Record({
  records: array(FirehoseRecord)
}) {}

export class FirehoseResponseRecord extends Record({
  recordId: string,
  data: string,
  result: string
}) {
  result: ValidationResult;
}
export class FirehoseResponse extends Record({
  records: array(FirehoseResponseRecord)
}) {}

export enum ValidationResult {
  Dropped = 'Dropped',
  Ok = 'Ok',
  ProcessingFailed = 'ProcessingFailed'
}