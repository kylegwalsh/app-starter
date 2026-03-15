import { config } from '@repo/config';

/** The type representing an authenticated MCP session from Better Auth */
export type McpSession = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  clientId?: string;
  userId?: string;
  scopes?: string;
};

/** The base URL for the Better Auth API (used by the MCP auth adapter) */
export const authURL = `${config.api.url}/api/auth`;
