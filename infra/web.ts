import { api } from './api';
import { domain } from './constants';

// const username = 'username';
// const password = 'password';
// const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

// Our main web app
export const site = new sst.aws.Nextjs('web', {
  domain: domain ? `app.${domain}` : undefined,
  link: [api],
  path: 'apps/web',
  buildCommand: 'bunx open-next build',
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
