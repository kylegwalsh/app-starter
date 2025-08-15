import { User } from '@prisma/client';

import { router as trpcRouter } from '@/routes';
import { Context } from '@/routes/trpc/context';

import { userFactory } from './user-factory';

/** Exports a factory for creating a test-based tRPC handler */
export const trpcFactory = {
  /** Creates a test-based tRPC handler with a user */
  createRouter: async ({ user: userFields }: { user?: Partial<User> } = {}) => {
    /** Create a default user (with optional field overrides) */
    const user = await userFactory.createUser(userFields);

    // Create the router
    const router = trpcRouter.createCaller({ user } as Context);

    return { user, router };
  },
};
