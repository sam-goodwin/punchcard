import { any, integer, optional, Record, string, timestamp } from "@punchcard/shape";

export class ExecutionContext extends Record({
  Id: string,
  Input: any,
  StartTime: timestamp
}) {}

export class StateContext extends Record({
  EnteredTime: timestamp,
  Name: string,
  RetryCount: integer
}) {}

export class StateMachineContext extends Record({
  Id: string
}) {}

export class TaskContext extends Record({
  Token: string
}) {}

/**
 * https://docs.aws.amazon.com/step-functions/latest/dg/input-output-contextobject.html
 */
export class Context extends Record({
  Execution: ExecutionContext,
  State: StateContext,
  StateMachine: StateMachineContext,
  Task: optional(TaskContext),
}) {}

export class ItemContext extends Record({
  Index: integer,
  Value: string
}) {}

/**
 * https://docs.aws.amazon.com/step-functions/latest/dg/input-output-contextobject.html#contextobject-map
 */
export class MapContext extends Context.Extend({
  Item: ItemContext
}) {}

/*
{
    "Execution": {
        "Id": "String",
        "Input": {},
        "StartTime": "Format: ISO 8601"
    },
    "State": {
        "EnteredTime": "Format: ISO 8601",
        "Name": "String",
        "RetryCount": Number
    },
    "StateMachine": {
        "Id": "String"
    },
    "Task": {
        "Token": "String"
    }
}
*/