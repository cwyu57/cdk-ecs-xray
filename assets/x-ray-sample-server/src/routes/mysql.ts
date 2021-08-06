import express from 'express';
import AWSXRay from 'aws-xray-sdk';
// Capture MySQL queries
export const mysql = AWSXRay.captureMySQL(require('mysql'));

export default (req: express.Request, res: express.Response) => {
  const config = {
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  };

  const table = process.env.MYSQL_TABLE;

  if (!config.user || !config.database || !config.password || !config.host || !table) {
    res.send('Please correctly mysql config');
    return;
  }

  const connection = mysql.createConnection(config);
  connection.query(`SELECT * FROM ${table}`, (err, results, fields) => {
    if (err) {
      res.send(`Encountered error while querying ${table}: ${err}`);
      return;
    }
    res.send(`Retrieved the following results from ${table}:\n${JSON.stringify(results, null, 2)}`);
  });

  connection.end();
}
