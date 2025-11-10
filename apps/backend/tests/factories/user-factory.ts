import type { User } from '@prisma/client';

import { db } from '@/db';

/** User-related factories for testing purposes */
export const userFactory = {
  /** Creates a user in the database */
  createUser: async (partial?: Partial<User>) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return await db.user.create({
      data: {
        id: partial?.id ?? `test-user-${unique}`,
        email: partial?.email ?? `test+${unique}@test.com`,
        name: partial?.name ?? 'Test User',
        emailVerified: partial?.emailVerified ?? true,
        ...partial,
      },
    });
  },
};
