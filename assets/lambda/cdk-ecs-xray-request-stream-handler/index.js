const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))

const region = process.env.AWS_REGION;
const bucketName = process.env.BUCKET_NAME;

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  region: region,
});

exports.handler = async (event) => {
  console.log('event =', JSON.stringify(event, null, 2));
  await Promise.all(
    event.Records.map((record) => {
      return s3.putObject({
        Bucket: bucketName,
        Key: record.dynamodb.NewImage.id.S,
        Body: JSON.stringify({ record }, null, 2),
        ContentType: 'application/json; charset=utf-8',
      }).promise();
    }),
  );
};
