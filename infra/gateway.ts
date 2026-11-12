import { domain } from './utils';

/** The domain for the API */
const apiDomain = domain ? `api.${domain}` : undefined;

/** REST API (v1), since HTTP API (v2) doesn't support Lambda response streaming */
export const gateway = new sst.aws.ApiGatewayV1('api', {
  domain: apiDomain,
  // Hono's cors() answers pre-flight requests so we disable it on the gateway
  cors: false,
  // Edge endpoints go through CloudFront, which caps requests at ~30s regardless of the integration timeout
  endpoint: { type: 'regional' },
});

/** Our API URL (initialized separately to avoid cycles) */
export const apiUrl = new sst.Linkable('apiUrl', {
  properties: {
    url: apiDomain
      ? $output(`https://${apiDomain}`)
      : $interpolate`https://${gateway.nodes.api.id}.execute-api.${aws.getRegionOutput().region}.amazonaws.com/${$app.stage}`,
  },
});
