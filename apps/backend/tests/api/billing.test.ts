import { db } from '@/db';

import { trpc } from '../mocks/trpc';

describe('Example Route Test', () => {
  it('should have access to the tRPC router', async () => {
    // Create item in DB
    await db.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@test.com',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Ensure the router returns the correct count
    const result = await trpc.billing.getPortalUrl();
    expect(result).toBe(1);
  });
});
