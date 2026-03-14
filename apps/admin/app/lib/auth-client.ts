import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** The API URL for our Better Auth backend */
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Better Auth client configured with the admin plugin */
export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
});

/** Convenience exports */
export const { signIn, signOut, useSession, getSession } = authClient;

/** Admin API methods */
export const adminApi = authClient.admin;

/** User type from the admin API */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Session type */
export type UserSession = {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};
