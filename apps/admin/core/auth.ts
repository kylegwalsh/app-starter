import { adminClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { User as BaseUser } from 'better-auth/types';

export type { Session } from 'better-auth/types';
export type { Organization, Member, Invitation } from 'better-auth/plugins/organization';

// Extend the base user type with admin plugin fields
export type User = BaseUser & {
  banned: boolean;
  banReason: string | null;
  banExpires: number | null;
  role: string | null;
};

/** The base URL for the auth API */
const AUTH_API_URL = process.env.NEXT_PUBLIC_API_URL;

/** The auth client is used to interact with better auth */
export const authClient = createAuthClient({
  baseURL: AUTH_API_URL,
  plugins: [adminClient(), organizationClient()],
});

// Export some helpers for our auth client
export const { signIn, signOut, signUp, useSession, getSession } = authClient;
export const adminApi = authClient.admin;
export const organizationApi = authClient.organization;
