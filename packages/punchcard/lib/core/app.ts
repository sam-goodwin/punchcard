import erasure = require('@punchcard/erasure');

import { isRuntime } from '../util/constants';
import { Build } from './build';
import { CDK } from './cdk';
import { Code } from './code';

import type * as cdk from '@aws-cdk/core';
import type * as webpack from 'webpack';

/**
 * Erase webpack and the CDK from the runtime bundle./
 */
erasure.erasePattern(/^(webpack|@aws-cdk.*)$/);

/**
 * Global Webpack Build context. Lazily requires webpack only at Build-time
 * so that developers can tune the webpack configuration of bundling without
 */
export const Webpack: Build<typeof import('webpack')> = Build.lazy(() => require('webpack')) as any;

export class App {
  /**
   * Root of the application contained within a Build context.
   */
  public readonly root: Build<cdk.App>;
  public readonly externals: Set<string> = new Set();
  public readonly plugins: Build<webpack.Plugin>[] = [];

  constructor() {
    this.root = CDK.map(({core}) => new core.App({
      autoSynth: false
    }));
    if (!isRuntime()) {
      this.addExternal('aws-sdk');

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
    return CDK.chain(({core}) => this.root.map(app => new core.Stack(app, id)));
  }

  public addExternal(external: string): void {
    this.externals.add(external);
  }

  public removeExternal(external: string): void {
    this.externals.delete(external);
  }
}

// webpack
// @aws-cdk/alexa-ask
// @aws-cdk/app-delivery
// @aws-cdk/assert
// @aws-cdk/assets
// @aws-cdk/aws-accessanalyzer
// @aws-cdk/aws-acmpca
// @aws-cdk/aws-amazonmq
// @aws-cdk/aws-amplify
// @aws-cdk/aws-apigateway
// @aws-cdk/aws-apigatewayv2
// @aws-cdk/aws-appconfig
// @aws-cdk/aws-applicationautoscaling
// @aws-cdk/aws-appmesh
// @aws-cdk/aws-appstream
// @aws-cdk/aws-appsync
// @aws-cdk/aws-athena
// @aws-cdk/aws-autoscaling-common
// @aws-cdk/aws-autoscaling-hooktargets
// @aws-cdk/aws-autoscaling
// @aws-cdk/aws-autoscalingplans
// @aws-cdk/aws-backup
// @aws-cdk/aws-batch
// @aws-cdk/aws-budgets
// @aws-cdk/aws-certificatemanager
// @aws-cdk/aws-cloud9
// @aws-cdk/aws-cloudformation
// @aws-cdk/aws-cloudfront
// @aws-cdk/aws-cloudtrail
// @aws-cdk/aws-cloudwatch-actions
// @aws-cdk/aws-cloudwatch
// @aws-cdk/aws-codebuild
// @aws-cdk/aws-codecommit
// @aws-cdk/aws-codedeploy
// @aws-cdk/aws-codepipeline-actions
// @aws-cdk/aws-codepipeline
// @aws-cdk/aws-codestar
// @aws-cdk/aws-codestarnotifications
// @aws-cdk/aws-cognito
// @aws-cdk/aws-config
// @aws-cdk/aws-datapipeline
// @aws-cdk/aws-dax
// @aws-cdk/aws-directoryservice
// @aws-cdk/aws-dlm
// @aws-cdk/aws-dms
// @aws-cdk/aws-docdb
// @aws-cdk/aws-dynamodb-global
// @aws-cdk/aws-dynamodb
// @aws-cdk/aws-ec2
// @aws-cdk/aws-ecr-assets
// @aws-cdk/aws-ecr
// @aws-cdk/aws-ecs-patterns
// @aws-cdk/aws-ecs
// @aws-cdk/aws-efs
// @aws-cdk/aws-eks-legacy
// @aws-cdk/aws-eks
// @aws-cdk/aws-elasticache
// @aws-cdk/aws-elasticbeanstalk
// @aws-cdk/aws-elasticloadbalancing
// @aws-cdk/aws-elasticloadbalancingv2-targets
// @aws-cdk/aws-elasticloadbalancingv2
// @aws-cdk/aws-elasticsearch
// @aws-cdk/aws-emr
// @aws-cdk/aws-events-targets
// @aws-cdk/aws-events
// @aws-cdk/aws-eventschemas
// @aws-cdk/aws-fms
// @aws-cdk/aws-fsx
// @aws-cdk/aws-gamelift
// @aws-cdk/aws-glue
// @aws-cdk/aws-greengrass
// @aws-cdk/aws-guardduty
// @aws-cdk/aws-iam
// @aws-cdk/aws-inspector
// @aws-cdk/aws-iot
// @aws-cdk/aws-iot1click
// @aws-cdk/aws-iotanalytics
// @aws-cdk/aws-iotevents
// @aws-cdk/aws-iotthingsgraph
// @aws-cdk/aws-kinesis
// @aws-cdk/aws-kinesisanalytics
// @aws-cdk/aws-kinesisfirehose
// @aws-cdk/aws-kms
// @aws-cdk/aws-lakeformation
// @aws-cdk/aws-lambda-destinations
// @aws-cdk/aws-lambda-event-sources
// @aws-cdk/aws-lambda-nodejs
// @aws-cdk/aws-lambda
// @aws-cdk/aws-logs-destinations
// @aws-cdk/aws-logs
// @aws-cdk/aws-managedblockchain
// @aws-cdk/aws-mediaconvert
// @aws-cdk/aws-medialive
// @aws-cdk/aws-mediastore
// @aws-cdk/aws-msk
// @aws-cdk/aws-neptune
// @aws-cdk/aws-opsworks
// @aws-cdk/aws-opsworkscm
// @aws-cdk/aws-pinpoint
// @aws-cdk/aws-pinpointemail
// @aws-cdk/aws-qldb
// @aws-cdk/aws-ram
// @aws-cdk/aws-rds
// @aws-cdk/aws-redshift
// @aws-cdk/aws-robomaker
// @aws-cdk/aws-route53-patterns
// @aws-cdk/aws-route53-targets
// @aws-cdk/aws-route53
// @aws-cdk/aws-route53resolver
// @aws-cdk/aws-s3-assets
// @aws-cdk/aws-s3-deployment
// @aws-cdk/aws-s3-notifications
// @aws-cdk/aws-s3
// @aws-cdk/aws-sagemaker
// @aws-cdk/aws-sam
// @aws-cdk/aws-sdb
// @aws-cdk/aws-secretsmanager
// @aws-cdk/aws-securityhub
// @aws-cdk/aws-servicecatalog
// @aws-cdk/aws-servicediscovery
// @aws-cdk/aws-ses-actions
// @aws-cdk/aws-ses
// @aws-cdk/aws-sns-subscriptions
// @aws-cdk/aws-sns
// @aws-cdk/aws-sqs
// @aws-cdk/aws-ssm
// @aws-cdk/aws-stepfunctions-tasks
// @aws-cdk/aws-stepfunctions
// @aws-cdk/aws-transfer
// @aws-cdk/aws-waf
// @aws-cdk/aws-wafregional
// @aws-cdk/aws-wafv2
// @aws-cdk/aws-workspaces
// @aws-cdk/cdk-assets-schema
// @aws-cdk/cfnspec
// @aws-cdk/cloudformation-diff
// @aws-cdk/core
// @aws-cdk/custom-resources
// @aws-cdk/cx-api
// @aws-cdk/region-info