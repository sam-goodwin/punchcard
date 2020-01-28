export interface FirehoseEvent {
  records: FirehoseRecord[];
}
export interface FirehoseRecord {
  recordId: string;
  data: string;
}

export interface FirehoseResponseRecord extends FirehoseRecord {
  result: ValidationResult;
}
export interface FirehoseResponse {
  records: FirehoseResponseRecord[];
}
export enum ValidationResult {
  Dropped = 'Dropped',
  Ok = 'Ok',
  ProcessingFailed = 'ProcessingFailed'
}