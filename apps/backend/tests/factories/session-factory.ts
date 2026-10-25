import type { Organization, User } from '@prisma/client';
import { hc } from 'hono/client';

import { router } from '@/api/routes';
import { auth } from '@/core';

import { organizationFactory } from './organization-factory';
import { userFactory } from './user-factory';

/** Exports a factory for creating authenticated test sessions */
export const sessionFactory = {
  /** Creates a user and organization, signs them in, and returns an API client acting as them */
  createSession: async ({
    user: userFields,
    organization: organizationFields,
  }: {
    user?: Partial<User>;
    organization?: Partial<Organization>;
  } = {}) => {
    // Create a default user and organization (with optional field overrides) in parallel
    const [user, organization] = await Promise.all([
      userFactory.createUser(userFields),
      organizationFactory.createOrganization(organizationFields),
    ]);

    /** Create membership relationship between user and organization */
    await organizationFactory.createMembership({
      userId: user.id,
      organizationId: organization.id,
      role: 'owner',
    });

    // Mock auth.api.getSession to return our test user and organization
    vi.spyOn(auth.api, 'getSession').mockResolvedValue({
      user,
      session: { activeOrganizationId: organization.id },
    } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>);

    // Dispatch straight into the Hono router in-process (no socket), attaching a
    // fake cookie on every request so `authMiddleware` triggers the mocked
    // session lookup above.
    const api = hc<typeof router>('http://test.local', {
      fetch: (input: string | URL | Request, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set('cookie', 'better-auth.session_token=test-session');
        return router.request(input instanceof Request ? input : String(input), {
          ...init,
          headers,
        });
      },
    });

    return { user, organization, api };
  },
};

/** A signed-in test session (user + org + api client) */
export type TestSession = Awaited<ReturnType<typeof sessionFactory.createSession>>;
