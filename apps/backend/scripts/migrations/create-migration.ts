/* eslint-disable no-console */
import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import readline from 'node:readline';

import { format } from '@repo/utils';
import inquirer from 'inquirer';

/**
 * To create a migration, we will use the shadow DB to run the migrate command.
 * This is because the shadow DB is a copy of the production DB and will have the
 * latest schema and migrations. Otherwise, we would have to reset our dev DB state
 * when working with prisma's push command.
 */

// ---------- HELPERS ----------
const DOCKER_NAME = 'prisma-shadow';
const DB_PORT = 5433;
const DB_URL = `postgresql://postgres:shadow@localhost:${DB_PORT}/shadowdb`;
const POSTGRES_IMAGE = 'postgres:16-alpine';

/** Stops and removes a the shadow DB docker container */
const stopShadowDB = () => {
  try {
    execSync(`docker rm -f ${DOCKER_NAME}`, { stdio: 'ignore' });
  } catch {
    // Ignore errors
  }
};

/** Helper to pad numbers to 2 digits */
const pad = (n: number) => n.toString().padStart(2, '0');

/** Generates a prisma migration directory name */
const getMigrationDirName = async (): Promise<string> => {
  // Prompt the user for a migration name
  let name = '';
  while (true) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    name = await new Promise<string>((resolve) => {
      rl.question('Enter a name for the new migration: ', (answer) => {
        rl.close();
        // Remove special characters except underscores and dashes, and trim
        const cleaned = answer.trim().replaceAll(/[^a-zA-Z0-9 _-]/g, '');
        resolve(cleaned);
      });
    });
    if (name.length > 0) break;
    console.log('Please enter a valid migration name.');
  }

  // Convert the name into a standard prisma migration file name
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds}_${format.case(name, 'snakeCase')}`;
};

/** Parse CLI arguments for non-interactive usage */
const parseCliArgs = (): { method?: 'schema' | 'manual' } => {
  const argv = process.argv.slice(2);
  let method: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--method' || arg === '-m') {
      method = argv[i + 1];
      i++;
      continue;
    }
    if (arg.startsWith('--method=')) {
      method = arg.split('=')[1];
      continue;
    }
  }

  if (method && method !== 'schema' && method !== 'manual') {
    console.error('❌ Invalid value for --method. Expected "schema" or "manual".');
    process.exit(1);
  }

  return { method: method as 'schema' | 'manual' | undefined };
};

/** Returns true if a TCP port is accepting connections */
const isPortOpen = (port: number, host = '127.0.0.1'): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(750);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });

/** Wait for a port to be open for up to timeoutMs */
const waitForPortOpen = async (port: number, timeoutMs = 15_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Port ${port} did not open within ${timeoutMs}ms`);
};

/** Syncs local changes to the migration */
const syncLocalChangesToMigration = async () => {
  /** Whether we had to start a shadow DB container manually */
  let startedShadowContainer = false;

  try {
    // If a service is already running on localhost:DB_PORT, use it; otherwise start a container
    const isOpen = await isPortOpen(DB_PORT);
    if (!isOpen) {
      console.log('\nStarting shadow DB container...');
      execSync(
        `docker run -d --rm --name ${DOCKER_NAME} -e POSTGRES_PASSWORD=shadow -e POSTGRES_DB=shadowdb -p ${DB_PORT}:5432 ${POSTGRES_IMAGE}`
      );
      startedShadowContainer = true;
      await waitForPortOpen(DB_PORT);
    }

    // Run Prisma migrate diff to generate up migration (if any is needed)
    console.log('\nChecking whether there were any changes to the schema...');
    const migrationUpBuffer = execSync(
      `pnpm dlx prisma migrate diff --from-migrations ./db/migrations --to-schema-datamodel ./db/schema.prisma --shadow-database-url ${DB_URL} --script`
    );
    const migrationUpContents = migrationUpBuffer.toString();

    // If it generated an empty migration, the DB is already up to date and we can stop here
    if (migrationUpContents.toLowerCase().includes('empty migration')) {
      console.log(`✔ Your DB is already up to date.\n`);
      process.exit(0);
    }

    // Prompt for migration name only when there are changes
    const migrationDirName = await getMigrationDirName();
    const migrationPath = `db/migrations/${migrationDirName}`;

    // Generate the down migration as well (for convenience)
    const migrationDownBuffer = execSync(
      `pnpm dlx prisma migrate diff --from-schema-datamodel ./db/schema.prisma --to-migrations ./db/migrations --shadow-database-url ${DB_URL} --script`
    );
    const migrationDownContents = migrationDownBuffer.toString();

    // Write the migration to a file
    fs.mkdirSync(migrationPath, { recursive: true });
    fs.writeFileSync(`${migrationPath}/migration.sql`, migrationUpContents);
    fs.writeFileSync(`${migrationPath}/migration-down.sql`, migrationDownContents);
    console.log(`✔ Migration created: apps/backend/${migrationPath}/migration.sql\n`);

    // Make sure the migration file has been applied to the DB (keeps them in sync)
    console.log('\nApplying migration...');
    execSync(`pnpm db:get-url \"prisma migrate resolve --applied ${migrationDirName}\"`, {
      stdio: 'inherit',
    });
    console.log('✔ Migration applied.\n');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMsg);

    if (errorMsg.includes('error during connect')) {
      console.error(
        '❗ There was a problem connecting to your shadow DB. Make sure you have Docker installed and running in the background.\n'
      );
    }

    process.exit(1);
  } finally {
    // Stop only if we started the container (do not kill CI service)
    if (startedShadowContainer) stopShadowDB();
  }
};

/** Generates a migration file without running it so that we can specify the changes manually */
const generateManualMigrationFile = () => {
  const child = spawn('pnpm', ['db:get-url', '"prisma migrate dev --create-only"'], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code: number | null) => {
    if (code === 0) {
      console.log(
        '\n✔ Migration file created. When you are done editing the file, run `pnpm db:migrate:deploy` to apply it to the DB.\n'
      );
    }

    process.exit(code ?? 0);
  });
};

// ---------- MIGRATION CREATION ----------
/** Create a migration using the shadow DB */
const createMigration = async () => {
  const { method } = parseCliArgs();

  // Ask user which type of migration they're running if not provided via CLI
  let migrationType = method;
  if (!migrationType) {
    const { migrationType: selectedMigrationType } = await inquirer.prompt<{
      migrationType: string;
    }>([
      {
        type: 'list',
        name: 'migrationType',
        message: 'What type of migration are you running?',
        choices: [
          { name: 'Schema change (sync changes during deployments)', value: 'schema' },
          { name: 'Manual data migration (custom SQL for complex changes)', value: 'manual' },
        ],
      },
    ]);

    migrationType = selectedMigrationType as 'schema' | 'manual';
  }

  // Run the appropriate migration type
  switch (migrationType) {
    case 'schema': {
      await syncLocalChangesToMigration();
      break;
    }
    case 'manual': {
      generateManualMigrationFile();
      break;
    }
  }
};

void createMigration();
