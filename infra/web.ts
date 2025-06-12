import { api } from './api';

// const username = 'username';
// const password = 'password';
// const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

/** The domain where we will host the web app */
const domain = undefined;

// Our main web app
export const site = new sst.aws.Nextjs('web', {
  domain,
  link: [api],
  path: 'apps/web',
  buildCommand: 'pnpm exec next build',
  environment: {
    NEXT_PUBLIC_STAGE: $app.stage,
    NEXT_PUBLIC_API_URL: api.url,
  },
  // Password protect every stage but prod
  // edge:
  //   $app.stage === 'prod'
  //     ? undefined
  //     : {
  //         viewerRequest: {
  //           injection: $interpolate`
  //           if (
  //               !event.request.headers.authorization
  //                 || event.request.headers.authorization.value !== "Basic ${basicAuth}"
  //              ) {
  //             return {
  //               statusCode: 401,
  //               headers: {
  //                 "www-authenticate": { value: "Basic" }
  //               }
  //             };
  //           }`,
  //         },
  //       },
});
