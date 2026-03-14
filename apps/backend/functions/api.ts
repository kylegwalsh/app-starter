import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { CORSPlugin } from '@orpc/server/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { analytics } from '@repo/analytics';
import { config } from '@repo/config';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

import { withLambdaContext } from '@/core';
import { router } from '@/routes';

// ---------- INITIALIZE OUR ROUTE HANDLER ----------
const orpcHandler = new OpenAPIHandler(router, {
  plugins: [
    new CORSPlugin(),
    new OpenAPIReferencePlugin({
      docsProvider: 'swagger',
      schemaConverters: [new ZodToJsonSchemaConverter()],
      specGenerateOptions: {
        info: { title: config.app.name, version: '1.0.0' },
        servers: [{ url: config.api.url }],
        // Only include routes tagged "public" in the OpenAPI spec
        filter: ({ contract }) => contract['~orpc'].route.tags?.includes('public') ?? false,
      },
    }),
  ],
});

// ---------- LAMBDA ADAPTER HELPERS ----------
/** Converts an API Gateway V2 event to a standard fetch Request */
const lambdaEventToRequest = (event: APIGatewayProxyEventV2): Request => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value) {
      headers.set(key, value);
    }
  }
  // API Gateway strips cookies from headers — re-add them
  if (event.cookies?.length) {
    headers.set('cookie', event.cookies.join('; '));
  }

  const url = `https://${event.requestContext.domainName}${event.rawPath}${event.rawQueryString ? `?${event.rawQueryString}` : ''}`;

  return new Request(url, {
    method: event.requestContext.http.method,
    headers,
    body: event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : event.body
      : undefined,
  });
};

/** Converts a fetch Response to an API Gateway V2 result */
const responseToLambdaResult = async (response: Response) => {
  const headers: Record<string, string> = {};
  for (const [key, value] of response.headers.entries()) {
    headers[key] = value;
  }

  const body = await response.text();

  return {
    statusCode: response.status,
    headers,
    body,
  };
};

// ---------- MAIN API ENTRY POINT ----------
/** The main entry point for the backend APIs */
export const handler = withLambdaContext<'api'>(async (event) => {
  const request = lambdaEventToRequest(event);
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value) {
      headers.set(key, value);
    }
  }
  if (event.cookies?.length) {
    headers.set('cookie', event.cookies.join('; '));
  }

  try {
    const { matched, response } = await orpcHandler.handle(request, {
      context: { headers },
    });

    if (matched && response) {
      return responseToLambdaResult(response);
    }
  } catch (error) {
    // Capture unexpected errors
    analytics.captureException(error);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ message: 'Not found' }),
  };
});
