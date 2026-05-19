import { domain } from './utils';

/** The domain for the API */
const apiDomain = domain ? `api.${domain}` : undefined;

/**
 * API Gateway v1 (REST API). Required for Lambda response
 * streaming — v2 (HTTP API) doesn't support it.
 *
 * `cors: false` so that OPTIONS preflights are forwarded to the Lambda proxy
 * instead of being answered by a MOCK integration at the gateway. The default
 * MOCK response returns `Access-Control-Allow-Origin: *`, which the browser
 * rejects when the request uses `credentials: include`. Hono's `cors()`
 * middleware handles preflights with a specific allow-origin.
 */
export const gateway = new sst.aws.ApiGatewayV1('api', {
  domain: apiDomain,
  // CORS is handled by our API middleware
  cors: false,
  // Regional endpoint instead of SST's default EDGE. Edge-optimized REST APIs
  // proxy through a CloudFront distribution with a 30s origin-response timeout
  // that ignores the integration's `timeoutMilliseconds` (we'd hit 29s no
  // matter what we set on the integration). Regional removes the CloudFront
  // hop so the integration timeout is the real ceiling.
  endpoint: { type: 'regional' },
});

/**
 * Pre-deploy API URL. Mirrors what `gateway.url` would resolve to, but is
 * computed from `api.id` + `$app.stage` instead of via the `Stage` resource.
 * That breaks the cycle that otherwise forms when other resources link
 * `gateway`: `apiHandler → web → gateway.url → Stage → Deployment → routes →
 * apiHandler.arn`. Stage and Deployment never end up in this Output's
 * dependency tree, so consumers can read it without pulling in deploy-time
 * resources. Exposed as a `Linkable` so the backend can read it via
 * `Resource.apiUrl.url` instead of a stringly-typed env var.
 */
export const apiUrl = new sst.Linkable('apiUrl', {
  properties: {
    url: apiDomain
      ? $output(`https://${apiDomain}`)
      : $interpolate`https://${gateway.nodes.api.id}.execute-api.${aws.getRegionOutput().region}.amazonaws.com/${$app.stage}`,
  },
});
