import express from 'express';
import AWSXRay from 'aws-xray-sdk';
import { Sequelize } from 'sequelize';


export default (req: express.Request, res: express.Response) => {
  const connection = new Sequelize({
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    dialectModule: AWSXRay.captureMySQL(require('mysql2')),
    dialect: 'mysql',
    logQueryParameters: true,
  });
  connection.authenticate()
  .then(() => res.send('sequelize connected'))
  .catch((err) => {
    res.json(err);
    connection.close();
  });
}
