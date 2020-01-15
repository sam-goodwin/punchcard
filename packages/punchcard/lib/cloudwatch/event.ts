import { any, array, ClassShape, Shape, string } from "@punchcard/shape";
import { Runtime } from "@punchcard/shape-runtime";

export interface Event extends Runtime.Of<typeof EventShape> {}

export class EventType {
  account = string;
  region = string;
  detail = any;
  'detail-type' = string;
  source = string;
  time = string;
  id = string;
  resources = array(string);
}

export const EventShape = Shape.of(EventType);
export type EventShape = typeof EventShape;