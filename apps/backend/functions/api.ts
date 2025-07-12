import { config } from '@repo/config';
import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda';
import { createOpenApiAwsLambdaHandler, generateOpenApiDocument } from 'better-trpc-openapi';

import { withLambdaContext } from '@/core';
import { router } from '@/routes';
import { createContext } from '@/routes/trpc/context';
import { onError } from '@/routes/trpc/error';

// ---------- INITIALIZE OUR ROUTE HANDLERS ----------
/** Our handler for tRPC routes */
const trpcHandler = awsLambdaRequestHandler({
  router,
  createContext,
  onError,
});

/** Generates a standard rest handler for any routes we flagged with rest meta data in our tRPC router */
const restHandler = createOpenApiAwsLambdaHandler({
  router,
  createContext,
  onError,
});

// ---------- MAIN API ENTRY POINT ----------
/** The main entry point for the backend APIs */
export const handler = withLambdaContext<'api'>(async (event, context) => {
  const path = event.rawPath;

  // If the path is /trpc, return the tRPC handler
  if (path.startsWith('/trpc')) {
    return trpcHandler(event, context);
  }

  // If the path is /api, return the REST handler
  if (path.startsWith('/api')) {
    return restHandler(event, context);
  }

  // If the path is /docs, return the swagger documentation
  if (path === '/docs') {
    // Generate our open API documentation and swagger UI
    const openApiDocument = generateOpenApiDocument(router, {
      title: config.app.name,
      version: '1.0.0',
      baseUrl: config.api.url,
    });
    const swaggerHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Swagger UI</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
          <script>
            window.onload = function() {
              SwaggerUIBundle({
                spec: ${JSON.stringify(openApiDocument)},
                dom_id: '#swagger-ui',
              });
            };
          </script>
        </body>
      </html>
    `;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: swaggerHtml,
    };
  }

  // If the path is not found, return a 404
  return {
    statusCode: 404,
    body: JSON.stringify({ message: 'Not found' }),
  };
});
