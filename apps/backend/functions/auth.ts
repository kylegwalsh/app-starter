import { config } from '@repo/config';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';

import { auth } from '@/core';

console.log('MY AUTH BACKEND', config.app.url);

/** Create a hono instance to handle routing for our auth routes */
const app = new Hono();
app.use(
  cors({
    origin: config.app.url,
  })
);

app.on(['POST', 'GET'], '/**', (c) => auth.handler(c.req.raw));

/** The main entry point for the auth API */
export const handler = handle(app);

// export const handler = () => {
//   return {
//     statusCode: 200,
//     body: 'Hello, world!',
//     headers: {
//       'Access-Control-Allow-Origin': 'http://test.com',
//       'Access-Control-Allow-Credentials': true,
//       'x-custom-header': 'test',
//     },
//   };
// };
