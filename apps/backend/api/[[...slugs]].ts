import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { withVercelContext } from '@/core/vercel';
import { router } from '@/routes';
import { createContext } from '@/routes/trpc/context';
import { onError } from '@/routes/trpc/error';

// ---------- MAIN API ENTRY POINT ----------
/** The main entry point for the backend APIs */
export default withVercelContext((request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // If the path is /trpc, return the tRPC handler
  if (path.startsWith('/trpc')) {
    return fetchRequestHandler({
      req: request,
      router,
      createContext: async (opts) => createContext({ req: opts.req }),
      onError,
      endpoint: '/trpc',
    });
  }

  // TODO: Re-add with orpc after vercel migration
  // // If the path is /api (but not /api/auth or /api/cron), return the REST handler
  // if (
  //   path.startsWith('/api') &&
  //   !path.startsWith('/api/auth') &&
  //   !path.startsWith('/api/cron')
  // ) {
  //   // Generates a standard rest handler for any routes we flagged with rest meta data in our tRPC router
  //   return createOpenApiFetchHandler({
  //     req: request,
  //     router,
  //     createContext: async (opts) => createContext({ req: opts.req }),
  //     onError,
  //     endpoint: '/api',
  //   });
  // }

  // // If the path is /docs, return the swagger documentation
  // if (path === '/docs') {
  //   // Generate our open API documentation and swagger UI
  //   const openApiDocument = generateOpenApiDocument(router, {
  //     title: config.app.name,
  //     version: '1.0.0',
  //     baseUrl: config.api.url,
  //   });
  //   const swaggerHtml = `
  //     <!DOCTYPE html>
  //     <html>
  //       <head>
  //         <title>Swagger UI</title>
  //         <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
  //       </head>
  //       <body>
  //         <div id="swagger-ui"></div>
  //         <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  //         <script>
  //           window.onload = function() {
  //             SwaggerUIBundle({
  //               spec: ${JSON.stringify(openApiDocument)},
  //               dom_id: '#swagger-ui',
  //             });
  //           };
  //         </script>
  //       </body>
  //     </html>
  //   `;

  //   return new Response(swaggerHtml, {
  //     status: 200,
  //     headers: { 'Content-Type': 'text/html' },
  //   });
  // }

  // If the path is not found, return a 404
  return new Response(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
});
