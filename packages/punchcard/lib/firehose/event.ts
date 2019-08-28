export interface FirehoseEvent {
  records: Array<{
    recordId: string;
    data: string;
  }>
}

export interface FirehoseResponse {
  records: Array<{
    recordId: string;
    result: ValidationResult;
    data: string;
  }>
}

export enum ValidationResult {
  Dropped = 'Dropped',
  Ok = 'Ok',
  ProcessingFailed = 'ProcessingFailed'
}