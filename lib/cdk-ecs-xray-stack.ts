import * as path from 'path'
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecrAssets from '@aws-cdk/aws-ecr-assets'
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as eventSources from '@aws-cdk/aws-lambda-event-sources';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as ssm from '@aws-cdk/aws-ssm';

export class CdkEcsXrayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: 'cdk-ecs-xray-static-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const table = new dynamodb.Table(this, 'DynamoDBTable', {
      tableName: 'cdk-ecs-xray-request',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dynamoStreamHandler = new lambda.Function(this, 'LambdaFunction', {
      functionName: 'cdk-ecs-xray-request-stream-handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/cdk-ecs-xray-request-stream-handler'),
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ['s3:*'],
          resources: ['*'],
        }),
      ],
    });

    dynamoStreamHandler.addEventSource(
      new eventSources.DynamoEventSource(table, {
        startingPosition: lambda.StartingPosition.LATEST,
      },
    ));

    const vpc = new ec2.Vpc(this, 'Vpc', { cidr: '10.0.0.0/16' });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition');

    const assets = new ecrAssets.DockerImageAsset(this, 'DockerImageAsset', {
      directory: path.join(__dirname, '../', 'x-ray-sample-server'),
    });

    const cloudwatchConfig = new ssm.StringParameter(this, 'Parameter', {
      parameterName: 'ecs-cwagent',
      stringValue: JSON.stringify({
        logs: {
          metrics_collected: {
            emf: {},
          },
        },
      }, null, 2),
    });

    taskDefinition
      .addContainer('XRaySampleServerContainer', {
        image: ecs.ContainerImage.fromDockerImageAsset(assets),
        memoryLimitMiB: 512,
        environment: {
          DEFAULT_AWS_REGION: process.env.CDK_DEFAULT_REGION!,
          MYSQL_HOST: process.env.MYSQL_HOST!,
          MYSQL_DATABASE: process.env.MYSQL_DATABASE!,
          MYSQL_USER: process.env.MYSQL_USER!,
          MYSQL_PASSWORD: process.env.MYSQL_PASSWORD!,
          MYSQL_TABLE: process.env.MYSQL_TABLE!,
          DYNAMO_TABLE_NAME: table.tableName,
        },
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: 'x-ray-ecs-fargate-service',
          logGroup: new logs.LogGroup(this, 'XRaySampleServerContainerLogGroup', {
            logGroupName: 'x-ray-ecs-fargate-service-x-ray-sample-server-container',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_WEEK,
          })
        }),
      })
      .addPortMappings({ containerPort: 3000 });

    taskDefinition
      .addContainer('XRayDaemonContainer', {
        image: ecs.ContainerImage.fromRegistry('amazon/aws-xray-daemon'),
        cpu: 32,
        memoryLimitMiB: 256,
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: 'x-ray-ecs-fargate-service',
          logGroup: new logs.LogGroup(this, 'XRayDaemonContainerLogGroup', {
            logGroupName: 'x-ray-ecs-fargate-service-x-ray-daemon-container',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_WEEK,
          })
        }),
      })
      .addPortMappings({ containerPort: 2000, protocol: ecs.Protocol.UDP });

    taskDefinition
      .addContainer('CloudwatchAgentContainer', {
        image: ecs.ContainerImage.fromRegistry('amazon/cloudwatch-agent'),
        cpu: 32,
        memoryLimitMiB: 256,
        secrets: {
          CW_CONFIG_CONTENT: ecs.Secret.fromSsmParameter(cloudwatchConfig),
        },
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: 'x-ray-ecs-fargate-service',
          logGroup: new logs.LogGroup(this, 'CloudwatchAgentContainerLogGroup', {
            logGroupName: 'x-ray-ecs-fargate-service-cloudwatch-agent-container',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_WEEK,
          }),
        }),
      });

    // preparing ECS task role
    taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
    );

    taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
    );

    taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
    );

    // preparing ECS task definition role
    taskDefinition.obtainExecutionRole().addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'),
    );

    taskDefinition.obtainExecutionRole().addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECSTaskExecutionRolePolicy'),
    );

    taskDefinition.obtainExecutionRole().addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
    );

    const fatgetService = new ecs.FargateService(this, 'FargateService', {
      cluster,
      taskDefinition,
    });

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
    });

    const listener = loadBalancer.addListener('Listener', { port: 80 });

    listener.addTargets('ECS', {
      port: 80,
      targets: [fatgetService],
    });
  }
}
