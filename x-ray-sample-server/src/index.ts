import express from 'express';
import AWSXRay from 'aws-xray-sdk';
import AWSSdk from 'aws-sdk'

// Capture all AWS clients we create
const AWS = AWSXRay.captureAWS(AWSSdk);
AWS.config.update({ region: process.env.DEFAULT_AWS_REGION });

// Capture all outgoing https requestss
AWSXRay.captureHTTPsGlobal(require('https'));
const https = require('https');

const XRayExpress = AWSXRay.express;

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

app.get('/aws-sdk/', (req, res) => {
  const ddb = new AWS.DynamoDB();
  const ddbPromise = ddb.listTables().promise();

  ddbPromise.then(function(data) {
    res.send(`ListTables result:\n ${JSON.stringify(data)}`);
  }).catch(function(err) {
    res.send(`Encountered error while calling ListTables: ${err}`);
  });
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
