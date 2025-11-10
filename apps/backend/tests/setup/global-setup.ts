import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Set up our mock database for our tests */
const setupMockDatabase = () => {
  // The new datasource and generator blocks to inject into our test schema
  const newDatasource = `
    datasource db {
      provider = "sqlite"
      url      = "file:./dev.db"
    }
  `;
  const newGenerator = `
    generator client {
      provider = "prisma-client-js"
      output   = "../../../../node_modules/.prisma-test/client"
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

  // Generate a fresh prisma client for our tests
  execSync(
    'pnpm exec prisma db push --schema=tests/generated/test-schema.prisma --accept-data-loss',
    {
      stdio: 'inherit',
    }
  );
};

/** Sets up our test environment (runs only once before all tests) */
export const setup = () => {
  setupMockDatabase();
};
