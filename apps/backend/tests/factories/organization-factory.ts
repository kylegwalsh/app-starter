import type { Organization } from '@prisma/client';

import { db } from '@/db';

/** Organization-related factories for testing purposes */
export const organizationFactory = {
  /** Creates an organization in the database */
  createOrganization: async (partial?: Partial<Organization>) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return await db.organization.create({
      data: {
        id: partial?.id ?? `test-org-${unique}`,
        name: partial?.name ?? 'Test Organization',
        slug: partial?.slug ?? `test-org-${unique}`,
        isPersonal: partial?.isPersonal ?? false,
        ...partial,
      },
    });
  },
  /** Creates a membership relationship between a user and organization */
  createMembership: async ({
    userId,
    organizationId,
    role = 'owner',
  }: {
    userId: string;
    organizationId: string;
    role?: string;
  }) =>
    await db.member.create({
      data: {
        userId,
        organizationId,
        role,
      },
    }),
};
