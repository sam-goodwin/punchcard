import { array, string, Type } from "@punchcard/shape";

export class FirehoseRecord extends Type({
  recordId: string,
  data: string
}) {}
export class FirehoseEvent extends Type({
  records: array(FirehoseRecord)
}) {}

export class FirehoseResponseRecord extends Type({
  recordId: string,
  data: string,
  result: string
}) {
  result: ValidationResult;
}
export class FirehoseResponse extends Type({
  records: array(FirehoseResponseRecord)
}) {}

export enum ValidationResult {
  Dropped = 'Dropped',
  Ok = 'Ok',
  ProcessingFailed = 'ProcessingFailed'
}