import { db } from '@/db';

describe('Example Test Suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should have access to the mock database', async () => {
    // Verify we can interact with the mock database
    const settings = await db.settings.create({
      data: {},
    });

    expect(settings).toBeDefined();
    expect(settings.id).toBeDefined();
  });
});
