import type * as cdk from '@aws-cdk/core';

import { isRuntime } from '../util/constants';
import { Build } from './build';
import { CDK } from './cdk';
import { Code } from './code';

import _fs = require('fs');

import type * as webpack from 'webpack';

export class App {
  public readonly root: Build<cdk.App>;
  public readonly externals: Set<string> = new Set();
  public readonly plugins: any[] = [];

  constructor() {
    this.root = Build.lazy(() => new CDK.Core.App({
      autoSynth: false
    }));
    if (!isRuntime()) {
      const webpack = require('webpack') as typeof import('webpack');

      this.addExternal('aws-sdk');
      // this.addExternal('webpack');
      // this.addExternal("@aws-cdk/alexa-ask");
      // this.addExternal("@aws-cdk/app-delivery");
      // this.addExternal("@aws-cdk/assert");
      // this.addExternal("@aws-cdk/assets");
      // this.addExternal("@aws-cdk/aws-accessanalyzer");
      // this.addExternal("@aws-cdk/aws-acmpca");
      // this.addExternal("@aws-cdk/aws-amazonmq");
      // this.addExternal("@aws-cdk/aws-amplify");
      // this.addExternal("@aws-cdk/aws-apigateway");
      // this.addExternal("@aws-cdk/aws-apigatewayv2");
      // this.addExternal("@aws-cdk/aws-appconfig");
      // this.addExternal("@aws-cdk/aws-applicationautoscaling");
      // this.addExternal("@aws-cdk/aws-appmesh");
      // this.addExternal("@aws-cdk/aws-appstream");
      // this.addExternal("@aws-cdk/aws-appsync");
      // this.addExternal("@aws-cdk/aws-athena");
      // this.addExternal("@aws-cdk/aws-autoscaling-common");
      // this.addExternal("@aws-cdk/aws-autoscaling-hooktargets");
      // this.addExternal("@aws-cdk/aws-autoscaling");
      // this.addExternal("@aws-cdk/aws-autoscalingplans");
      // this.addExternal("@aws-cdk/aws-backup");
      // this.addExternal("@aws-cdk/aws-batch");
      // this.addExternal("@aws-cdk/aws-budgets");
      // this.addExternal("@aws-cdk/aws-certificatemanager");
      // this.addExternal("@aws-cdk/aws-cloud9");
      // this.addExternal("@aws-cdk/aws-cloudformation");
      // this.addExternal("@aws-cdk/aws-cloudfront");
      // this.addExternal("@aws-cdk/aws-cloudtrail");
      // this.addExternal("@aws-cdk/aws-cloudwatch-actions");
      // this.addExternal("@aws-cdk/aws-cloudwatch");
      // this.addExternal("@aws-cdk/aws-codebuild");
      // this.addExternal("@aws-cdk/aws-codecommit");
      // this.addExternal("@aws-cdk/aws-codedeploy");
      // this.addExternal("@aws-cdk/aws-codepipeline-actions");
      // this.addExternal("@aws-cdk/aws-codepipeline");
      // this.addExternal("@aws-cdk/aws-codestar");
      // this.addExternal("@aws-cdk/aws-codestarnotifications");
      // this.addExternal("@aws-cdk/aws-cognito");
      // this.addExternal("@aws-cdk/aws-config");
      // this.addExternal("@aws-cdk/aws-datapipeline");
      // this.addExternal("@aws-cdk/aws-dax");
      // this.addExternal("@aws-cdk/aws-directoryservice");
      // this.addExternal("@aws-cdk/aws-dlm");
      // this.addExternal("@aws-cdk/aws-dms");
      // this.addExternal("@aws-cdk/aws-docdb");
      // this.addExternal("@aws-cdk/aws-dynamodb-global");
      // this.addExternal("@aws-cdk/aws-dynamodb");
      // this.addExternal("@aws-cdk/aws-ec2");
      // this.addExternal("@aws-cdk/aws-ecr-assets");
      // this.addExternal("@aws-cdk/aws-ecr");
      // this.addExternal("@aws-cdk/aws-ecs-patterns");
      // this.addExternal("@aws-cdk/aws-ecs");
      // this.addExternal("@aws-cdk/aws-efs");
      // this.addExternal("@aws-cdk/aws-eks-legacy");
      // this.addExternal("@aws-cdk/aws-eks");
      // this.addExternal("@aws-cdk/aws-elasticache");
      // this.addExternal("@aws-cdk/aws-elasticbeanstalk");
      // this.addExternal("@aws-cdk/aws-elasticloadbalancing");
      // this.addExternal("@aws-cdk/aws-elasticloadbalancingv2-targets");
      // this.addExternal("@aws-cdk/aws-elasticloadbalancingv2");
      // this.addExternal("@aws-cdk/aws-elasticsearch");
      // this.addExternal("@aws-cdk/aws-emr");
      // this.addExternal("@aws-cdk/aws-events-targets");
      // this.addExternal("@aws-cdk/aws-events");
      // this.addExternal("@aws-cdk/aws-eventschemas");
      // this.addExternal("@aws-cdk/aws-fms");
      // this.addExternal("@aws-cdk/aws-fsx");
      // this.addExternal("@aws-cdk/aws-gamelift");
      // this.addExternal("@aws-cdk/aws-glue");
      // this.addExternal("@aws-cdk/aws-greengrass");
      // this.addExternal("@aws-cdk/aws-guardduty");
      // this.addExternal("@aws-cdk/aws-iam");
      // this.addExternal("@aws-cdk/aws-inspector");
      // this.addExternal("@aws-cdk/aws-iot");
      // this.addExternal("@aws-cdk/aws-iot1click");
      // this.addExternal("@aws-cdk/aws-iotanalytics");
      // this.addExternal("@aws-cdk/aws-iotevents");
      // this.addExternal("@aws-cdk/aws-iotthingsgraph");
      // this.addExternal("@aws-cdk/aws-kinesis");
      // this.addExternal("@aws-cdk/aws-kinesisanalytics");
      // this.addExternal("@aws-cdk/aws-kinesisfirehose");
      // this.addExternal("@aws-cdk/aws-kms");
      // this.addExternal("@aws-cdk/aws-lakeformation");
      // this.addExternal("@aws-cdk/aws-lambda-destinations");
      // this.addExternal("@aws-cdk/aws-lambda-event-sources");
      // this.addExternal("@aws-cdk/aws-lambda-nodejs");
      // this.addExternal("@aws-cdk/aws-lambda");
      // this.addExternal("@aws-cdk/aws-logs-destinations");
      // this.addExternal("@aws-cdk/aws-logs");
      // this.addExternal("@aws-cdk/aws-managedblockchain");
      // this.addExternal("@aws-cdk/aws-mediaconvert");
      // this.addExternal("@aws-cdk/aws-medialive");
      // this.addExternal("@aws-cdk/aws-mediastore");
      // this.addExternal("@aws-cdk/aws-msk");
      // this.addExternal("@aws-cdk/aws-neptune");
      // this.addExternal("@aws-cdk/aws-opsworks");
      // this.addExternal("@aws-cdk/aws-opsworkscm");
      // this.addExternal("@aws-cdk/aws-pinpoint");
      // this.addExternal("@aws-cdk/aws-pinpointemail");
      // this.addExternal("@aws-cdk/aws-qldb");
      // this.addExternal("@aws-cdk/aws-ram");
      // this.addExternal("@aws-cdk/aws-rds");
      // this.addExternal("@aws-cdk/aws-redshift");
      // this.addExternal("@aws-cdk/aws-robomaker");
      // this.addExternal("@aws-cdk/aws-route53-patterns");
      // this.addExternal("@aws-cdk/aws-route53-targets");
      // this.addExternal("@aws-cdk/aws-route53");
      // this.addExternal("@aws-cdk/aws-route53resolver");
      // this.addExternal("@aws-cdk/aws-s3-assets");
      // this.addExternal("@aws-cdk/aws-s3-deployment");
      // this.addExternal("@aws-cdk/aws-s3-notifications");
      // this.addExternal("@aws-cdk/aws-s3");
      // this.addExternal("@aws-cdk/aws-sagemaker");
      // this.addExternal("@aws-cdk/aws-sam");
      // this.addExternal("@aws-cdk/aws-sdb");
      // this.addExternal("@aws-cdk/aws-secretsmanager");
      // this.addExternal("@aws-cdk/aws-securityhub");
      // this.addExternal("@aws-cdk/aws-servicecatalog");
      // this.addExternal("@aws-cdk/aws-servicediscovery");
      // this.addExternal("@aws-cdk/aws-ses-actions");
      // this.addExternal("@aws-cdk/aws-ses");
      // this.addExternal("@aws-cdk/aws-sns-subscriptions");
      // this.addExternal("@aws-cdk/aws-sns");
      // this.addExternal("@aws-cdk/aws-sqs");
      // this.addExternal("@aws-cdk/aws-ssm");
      // this.addExternal("@aws-cdk/aws-stepfunctions-tasks");
      // this.addExternal("@aws-cdk/aws-stepfunctions");
      // this.addExternal("@aws-cdk/aws-transfer");
      // this.addExternal("@aws-cdk/aws-waf");
      // this.addExternal("@aws-cdk/aws-wafregional");
      // this.addExternal("@aws-cdk/aws-wafv2");
      // this.addExternal("@aws-cdk/aws-workspaces");
      // this.addExternal("@aws-cdk/cdk-assets-schema");
      // this.addExternal("@aws-cdk/cfnspec");
      // this.addExternal("@aws-cdk/cloudformation-diff");
      // this.addExternal("@aws-cdk/core");
      // this.addExternal("@aws-cdk/custom-resources");
      // this.addExternal("@aws-cdk/cx-api");
      // this.addExternal("@aws-cdk/region-info");

      this.addPlugin(new webpack.IgnorePlugin({
        resourceRegExp: /^(webpack|@aws-cdk.*|@punchcard\/constructs)$/
      }));

      process.once('beforeExit', () => {
        // resolve the reference to the root - only the root App is resolved at this time.
        const app = Build.resolve(this.root);
        // code compilation is an asynchronous process so we initialize it here
        // before entering the Build domain containing Constructs.
        Code.initCode(app, Array.from(this.externals), this.plugins).then(() => {
          // resolve all nodes in the Build domain
          Build.walkAll();
          // Build.walk(this.root);
          // synth the fully-constructed Construct tree.
          app.synth();
        });
      });
    }
  }

  public stack(id: string): Build<cdk.Stack> {
    return this.root.map(app => new CDK.Core.Stack(app, id));
  }

  public addExternal(external: string): void {
    this.externals.add(external);
  }

  public removeExternal(external: string): void {
    this.externals.delete(external);
  }

  public addPlugin(plugin: webpack.Plugin): void {
    this.plugins.push(plugin);
  }
}
