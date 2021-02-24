#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkEcsXrayStack } from '../lib/cdk-ecs-xray-stack';

const app = new cdk.App();
new CdkEcsXrayStack(app, 'CdkEcsXrayStack');
