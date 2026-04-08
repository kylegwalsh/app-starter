/** Headers that must be allowed through CORS (shared between API Gateway and Hono) */
export const CORS_ALLOW_HEADERS = [
  'accept',
  'content-type',
  'authorization',
  'cookie',
  'x-posthog-session-id',
  'mcp-session-id',
  'mcp-protocol-version',
  'last-event-id',
] as const;

/** Headers that must be exposed to the client via CORS */
export const CORS_EXPOSE_HEADERS = ['set-cookie', 'mcp-session-id'] as const;
