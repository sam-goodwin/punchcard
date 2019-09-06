import AWS = require('aws-sdk');

import iam = require('@aws-cdk/aws-iam');
import sfn = require('@aws-cdk/aws-stepfunctions');

import { Namespace } from "../core/assembly";
import { Cache } from "../core/cache";
import { Dependency } from "../core/dependency";
import { Json } from '../shape/json/mapper';
import { Mapper } from '../shape/mapper/mapper';
import { RuntimeShape, Shape } from "../shape/shape";

export class StateMachine<S extends Shape<any>> implements Dependency<StateMachineClient<RuntimeShape<S>>> {
  constructor(private readonly machine: sfn.StateMachine, private readonly shape: S) {}

  public install(namespace: Namespace, grantable: iam.IGrantable): void {
    namespace.set('stateMachineArn', this.machine.stateMachineArn);
    this.machine.grantStartExecution(grantable);
  }

  public async bootstrap(namespace: Namespace, cache: Cache): Promise<StateMachineClient<RuntimeShape<S>>> {
    return new StateMachineClient(
      cache.getOrCreate('aws:stepfunctions', () => new AWS.StepFunctions()),
      namespace.get('stateMachineArn'),
      Json.forShape(this.shape));
  }

}
export class StateMachineClient<S> {
  constructor(
    public readonly client: AWS.StepFunctions,
    public readonly stateMachineArn: string,
    public readonly mapper: Mapper<S, string>,
  ) {}

  public startExecution(props: {
    name: string;
    state: S
  }): Promise<AWS.StepFunctions.StartExecutionOutput> {
    return this.client.startExecution({
      stateMachineArn: this.stateMachineArn,
      input: this.mapper.write(props.state),
      name: props.name
    }).promise();
  }
}