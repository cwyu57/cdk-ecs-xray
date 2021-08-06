import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { CdkEcsXrayStack } from '../src/main';

test('Snapshot', () => {
  const app = new App();
  const stack = new CdkEcsXrayStack(app, 'test');

  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});
