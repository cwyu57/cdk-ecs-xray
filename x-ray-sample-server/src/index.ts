import express from 'express';
import AWSXRay from 'aws-xray-sdk';
import AWSSdk from 'aws-sdk'

const AWS = AWSXRay.captureAWS(AWSSdk);
const XRayExpress = AWSXRay.express;
AWS.config.update({ region: process.env.DEFAULT_AWS_REGION });

const app = express();
const port = 3000;

app.use(XRayExpress.openSegment('SampleSite'));

app.get('/', (req, res) => {
  const seg = AWSXRay.getSegment();
  const sub = seg!.addNewSubsegment('customSubsegment');
  setTimeout(() => {
    sub.close();
    res.sendFile(`${process.cwd()}/index.html`);
  }, 500);
});

app.use(XRayExpress.closeSegment());

app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});
