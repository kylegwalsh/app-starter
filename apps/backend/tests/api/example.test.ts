import { db } from '@/db';
import { trpc } from '../mocks/trpc';

describe('Example Route Test', () => {
  it('should have access to the tRPC router', async () => {
    // Create item in DB
    await db.settings.create({
      data: {},
    });

    // Ensure the router returns the correct count
    const result = await trpc.test();
    expect(result).toBe(1);
  });
});
