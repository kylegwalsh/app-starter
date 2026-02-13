import type { Context } from '@/routes/trpc/context';
import type { Organization, User } from '@prisma/client';

import { router as trpcRouter } from '@/routes';

import { organizationFactory } from './organization-factory';
import { userFactory } from './user-factory';

/** Exports a factory for creating a test-based tRPC handler */
export const trpcFactory = {
  /** Creates a test-based tRPC handler with a user and organization */
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

    // Create the router
    const router = trpcRouter.createCaller({ user, organization } as Context);

    return { user, organization, router };
  },
};
