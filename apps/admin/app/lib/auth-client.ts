import { adminClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Session, User as BaseUser } from 'better-auth/types';

export type { Session } from 'better-auth/types';
export type { Organization, Member, Invitation } from 'better-auth/plugins/organization';

// Extend the base user type with admin plugin fields
export type User = BaseUser & {
  banned: boolean;
  banReason: string | null;
  banExpires: number | null;
  role: string | null;
};

// Base URL for the auth API — VITE_API_URL is set by SST at build time
const AUTH_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: AUTH_API_URL,
  plugins: [adminClient(), organizationClient()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;

export const adminApi = authClient.admin;

export const organizationApi = authClient.organization;
