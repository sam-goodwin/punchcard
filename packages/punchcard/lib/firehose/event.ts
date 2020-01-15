import { array, Shape, string } from "@punchcard/shape";
import { Value } from "@punchcard/shape-runtime";

// tslint:disable-next-line: member-access
export class FirehoseRecordType {
  recordId = string;
  data = string;
}
export const FirehoseRecordShape = Shape.of(FirehoseRecordType);
export type FirehoseRecordShape = typeof FirehoseRecordShape;
export interface FirehoseRecord extends Value.Of<FirehoseRecordShape> {}

export class FirehoseEventType {
  records = array(FirehoseRecordType);
}
export const FirehoseEventShape = Shape.of(FirehoseEventType);
export type FirehoseEventShape = typeof FirehoseEventShape;
export interface FirehoseEvent extends Value.Of<FirehoseEventShape> {}

export class FirehoseResponseRecordType extends FirehoseRecordType {
  result = string; // TODO: support enums for ValidationResult
}
export const FirehoseResponseRecordShape = Shape.of(FirehoseResponseRecordType);
export type FirehoseResponseRecordShape = typeof FirehoseResponseRecordShape;
export interface FirehoseResponseRecord extends Value.Of<FirehoseResponseRecordShape> {}

export class FirehoseResponseType {
  records = array(FirehoseResponseRecordType);
}
export const FirehoseResponseShape = Shape.of(FirehoseResponseType);
export type FirehoseResponseShape = typeof FirehoseResponseShape;
export interface FirehoseResponse extends Value.Of<FirehoseResponseShape> {}

/**
 * TODO: support enum types
 */
export enum ValidationResult {
  Dropped = 'Dropped',
  Ok = 'Ok',
  ProcessingFailed = 'ProcessingFailed'
}