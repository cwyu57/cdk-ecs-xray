import express from 'express';
import AWSXRay from 'aws-xray-sdk';
import axios from 'axios';
import http from 'http';
import https from 'https';

// Capture all outgoing http/https requests
AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

export default (req: express.Request, res: express.Response) => {
  axios.get('https://ipinfo.io/').then((response) => {
    res.json(response.data);
  })
}
