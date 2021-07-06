const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

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
        Key: record.dynamodb.NewImage.id,
        Body: {
          record: record
        },
      }).promise();
    }),
  );
};
