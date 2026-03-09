import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Set up our mock database for our tests */
const setupMockDatabase = () => {
  // Use PostgreSQL (matching production) with PGlite driver adapter
  const newDatasource = `
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
  `;
  const newGenerator = `
    generator client {
      provider        = "prisma-client-js"
      output          = "../../../../node_modules/.prisma-test/client"
      previewFeatures = ["driverAdapters"]
    }
  `;

  const srcSchemaPath = path.resolve('db/schema.prisma');
  const generatedDir = path.resolve('tests/generated');
  const destSchemaPath = path.join(generatedDir, 'test-schema.prisma');

  // Ensure the generated directory exists
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Read the original schema
  let schema = fs.readFileSync(srcSchemaPath, 'utf8');

  // Remove existing datasource and generator blocks
  schema = schema
    .replaceAll(/datasource\s+\w+\s*\{[^}]*\}/gs, '')
    .replaceAll(/generator\s+\w+\s*\{[^}]*\}/gs, '');

  // Add the new datasource and generator blocks at the top
  schema = `${newDatasource}\n${newGenerator}\n${schema.trim()}\n`;

  // Write the modified schema to the generated folder
  fs.writeFileSync(destSchemaPath, schema);

  // Generate the Prisma client for our tests
  execSync('bunx prisma generate --schema=tests/generated/test-schema.prisma --no-hints', {
    stdio: 'inherit',
  });

  // Generate SQL to create all tables (used by each worker to initialize its PGlite instance)
  const sql = execSync(
    'bunx prisma migrate diff --from-empty --to-schema-datamodel=tests/generated/test-schema.prisma --script',
    { encoding: 'utf8' },
  );
  fs.writeFileSync(path.join(generatedDir, 'setup.sql'), sql);
};

/** Sets up our test environment (runs only once before all tests) */
export const setup = () => {
  setupMockDatabase();
};
