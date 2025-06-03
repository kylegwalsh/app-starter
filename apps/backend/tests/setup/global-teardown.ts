import { PrismaClient } from '.prisma/client';

/** Tears down our test environment (runs only once after all tests) */
export const teardown = async () => {
  // We do a lazy import because this module isn't ready until the global setup runs
  // and this file will prevent it from running if it crashes
  const { db } = await import('../mocks/db');

  // Note: This type is only defined after running the tests once
  if (db) await (db as PrismaClient).$disconnect();
};
