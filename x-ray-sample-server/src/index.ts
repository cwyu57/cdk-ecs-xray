import express from 'express';
import AWSXRay from 'aws-xray-sdk';
import AWSSdk from 'aws-sdk'

AWSXRay.captureHTTPsGlobal(require('https'));
const https = require('https');

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

app.get('/http-request/', (req, res) => {
  const endpoint = 'https://amazon.com/';
  https.get(endpoint, (response: any) => {
    response.on('data', () => {});

    response.on('error', (err: any) => {
      res.send(`Encountered error while making HTTPS request: ${err}`);
    });

    response.on('end', () => {
      res.send(`Successfully reached ${endpoint}.`);
    });
  });
});

app.use(XRayExpress.closeSegment());

app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});
