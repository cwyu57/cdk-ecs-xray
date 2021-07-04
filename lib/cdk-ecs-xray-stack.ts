import * as path from 'path'
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecrAssets from '@aws-cdk/aws-ecr-assets'
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';

export class CdkEcsXrayStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const vpc = new ec2.Vpc(this, 'Vpc', { cidr: '10.0.0.0/16' });

    const assets = new ecrAssets.DockerImageAsset(this, 'DockerImageAsset', {
      directory: path.join(__dirname, '../', 'x-ray-sample-server'),
    });

    const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition');

    taskDefinition
      .addContainer('XRaySampleServerContainer', {
        image: ecs.ContainerImage.fromDockerImageAsset(assets),
        memoryLimitMiB: 512,
      })
      .addPortMappings({ containerPort: 3000 });

    taskDefinition
      .addContainer('XRayDaemonContainer', {
        image: ecs.ContainerImage.fromRegistry('amazon/aws-xray-daemon'),
        cpu: 32,
        memoryLimitMiB: 256,
      })
      .addPortMappings({ containerPort: 2000, protocol: ecs.Protocol.UDP });

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
