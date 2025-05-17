import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Extract the next command
const command = process.argv[2];

interface Secrets {
  DATABASE_URL?: string;
  DIRECT_DATABASE_URL?: string;
  [key: string]: string | undefined;
}

/** Helper method used to retrieve secrets from sst */
const parseSecrets = async (): Promise<Secrets> => {
  try {
    // Run sst secret list and parse output
    const { stdout } = await execAsync('sst secret list');
    const secrets = stdout
      .trim()
      .split('\n')
      .reduce<Secrets>((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {});
    return secrets;
  } catch (error) {
    console.error('Failed to list secrets', error);
    return {};
  }
};

/** Main function to set the environment variable */
const getDatabaseURL = async () => {
  console.log('Querying DATABASE_URL...');

  const secrets = await parseSecrets();
  const databaseURL = secrets.DATABASE_URL;
  const directDatabaseURL = secrets.DIRECT_DATABASE_URL;

  // If secrets don't exist, we have to error
  if (!databaseURL || !directDatabaseURL) {
    throw new Error('DATABASE_URL is not set. Exiting...');
  }

  console.log('DATABASE_URL set, continuing...');

  // Set environment variable for current process
  execSync(command, {
    env: {
      ...process.env,
      DATABASE_URL: databaseURL,
      DIRECT_DATABASE_URL: directDatabaseURL,
    },
    stdio: 'inherit',
  });
};

await getDatabaseURL();
