import { createRouterClient } from '@orpc/server';
import type { Organization, User } from '@prisma/client';

import { router } from '@/routes';

import { organizationFactory } from './organization-factory';
import { userFactory } from './user-factory';

/** Exports a factory for creating a test-based oRPC router client */
export const routerFactory = {
  /** Creates a test-based router client with a user and organization */
  createRouter: async ({
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

    // Create the router client
    const client = createRouterClient(router, {
      context: { headers: new Headers() },
    });

    return { user, organization, router: client };
  },
};
