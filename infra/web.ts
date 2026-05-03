import { gateway } from './gateway';
import { domain } from './utils';

// const username = 'username';
// const password = 'password';
// const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

/** Main web app */
export const web = new sst.aws.Nextjs('web', {
  domain: domain ? `app.${domain}` : undefined,
  link: [gateway],
  path: 'apps/web',
  buildCommand: 'bun run build:open-next',
  environment: {
    NEXT_PUBLIC_STAGE: $app.stage,
    NEXT_PUBLIC_API_URL: gateway.url,
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
