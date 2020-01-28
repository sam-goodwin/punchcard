export interface Event {
  account: string;
  region: string;
  detail: any;
  'detail-type': string;
  source: string;
  time: string;
  id: string;
  resources: string[];
}
