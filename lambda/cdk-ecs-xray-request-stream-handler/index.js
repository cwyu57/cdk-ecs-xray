const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

exports.handler = async (event) => {
  console.log('event =', JSON.stringify(event, null, 2));
};
