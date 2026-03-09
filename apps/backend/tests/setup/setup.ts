import fs from 'node:fs';
import path from 'node:path';

import { client, db } from '../mocks/db';

// Path to the SQL file generated during global setup
const sqlPath = path.resolve(import.meta.dirname, '../generated/setup.sql');

// Runs once before each test process
beforeAll(async () => {
  // Apply the prisma schema to our in-memory PGlite instance (initializes tables)
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.exec(sql);
});

// Runs once after each test process
afterAll(async () => {
  await db.$disconnect();
  await client.close();
});

// Runs before every single test
beforeEach(async () => {
  // Truncate all tables (ensures a fresh start for each test)
  const result = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'`,
  );
  const tables = result.rows.map((r) => `"${r.tablename}"`).join(', ');
  if (tables) {
    await client.exec(`TRUNCATE ${tables} CASCADE`);
  }
});
