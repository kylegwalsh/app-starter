import { copyFileSync } from 'node:fs';
import path from 'node:path';

import { db } from '@/db';

// The path to the empty template database
const templateDbPath = path.resolve(import.meta.dirname, '../generated/dev.db');
// Each Vitest worker gets a unique VITEST_POOL_ID — use it to isolate SQLite databases per worker
const poolId = process.env.VITEST_POOL_ID ?? '0';
const testDbPath = path.resolve(import.meta.dirname, `../generated/test-${poolId}.db`);

// Runs once before each test process
beforeAll(() => {
  // Copy the empty template database to a new database for this
  // test process to ensure each has a fresh isolated database
  copyFileSync(templateDbPath, testDbPath);
});

// Runs once after each test process
afterAll(async () => {
  // Disconnect from the database
  await db.$disconnect();
});

// Runs before every single test
beforeEach(async () => {
  // We need to delete all data between tests to ensure each test is independent
  // Disable FK constraints (so deletes don't complain about foreign key violations)
  await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

  // Delete all data from all tables
  const tables: { name: string }[] = await db.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_prisma%' AND name != 'sqlite_sequence'`,
  );
  await db.$transaction(tables.map((t) => db.$executeRawUnsafe(`DELETE FROM "${t.name}"`)));

  // Re-enable FK constraints
  await db.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
});
