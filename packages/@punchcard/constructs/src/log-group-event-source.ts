import lambda = require('@aws-cdk/aws-lambda');
import logs = require('@aws-cdk/aws-logs');
import logsdests = require('@aws-cdk/aws-logs-destinations');
import cdk = require('@aws-cdk/core');

/**
 * Properties forwarded to the Lambda Subscription.
 */
export interface LogGroupEventSourceProps {
  filterPattern?: logs.IFilterPattern;
}

/**
 * Use an CloudWatch Logs log group as an event source for AWS Lambda.
 */
export class LogGroupEventSource implements lambda.IEventSource {
  constructor(private readonly logGroup: logs.LogGroup, private readonly props?: LogGroupEventSourceProps) {}

  public bind(target: lambda.IFunction) {
    this.logGroup.addSubscriptionFilter('Lambda', {
      destination: new logsdests.LambdaDestination(target),
      filterPattern: this.props?.filterPattern ?? logs.FilterPattern.allEvents()
    });
  }
}
