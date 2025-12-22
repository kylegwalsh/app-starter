import {
  type ExecSyncOptionsWithBufferEncoding,
  exec,
} from 'node:child_process';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

import { pullEnvVars } from './pull-env.js';

// This script is used to add environment variables to our prod and dev environments in the cloud

/** Create an interface to get user input */
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});
/** Ensure our commands can run in parallel */
const execAsync = promisify(exec);

/**
 * Adds an environment variable to a specific Vercel environment
 */
const addEnvVarToSingleEnvironment = async (
  name: string,
  environment: 'preview' | 'development' | 'production',
  value: string
): Promise<void> => {
  // Escape the value for shell safety
  const escapedValue = value.replace(/'/g, "'\"'\"'");
  const command = `echo '${escapedValue}' | vercel env add ${name} ${environment} --yes --cwd apps/backend`;
  await execAsync(command, {
    stdio: 'inherit',
  } as ExecSyncOptionsWithBufferEncoding);
};

/**
 * Adds an environment variable to all three environments (preview, development, production) in parallel
 */
export const addEnvVar = async ({
  name,
  devValue,
  prodValue,
  shouldUpdateTypes = false,
}: {
  name: string;
  devValue: string;
  prodValue?: string;
  shouldUpdateTypes?: boolean;
}): Promise<void> => {
  await Promise.all([
    addEnvVarToSingleEnvironment(name, 'preview', devValue),
    addEnvVarToSingleEnvironment(name, 'development', devValue),
    ...(prodValue
      ? [addEnvVarToSingleEnvironment(name, 'production', prodValue)]
      : []),
  ]);

  // Refresh local env vars and types if requested
  if (shouldUpdateTypes) {
    try {
      pullEnvVars({ env: 'development', shouldUpdateTypes: true });
    } catch {
      // Silently fail - env var was added successfully, just couldn't refresh local file
    }
  }
};

// Check for command line arguments
const nameArg = process.argv[2];
const devValueArg = process.argv[3];
const prodValueArg = process.argv[4];

// If we are provided all of the necessary arguments, we can skip the prompts
if (nameArg && devValueArg && prodValueArg) {
  // Non-interactive mode: use arguments
  if (!nameArg) {
    throw new Error('You must provide a name!');
  }
  if (!devValueArg) {
    throw new Error('You must provide a dev value!');
  }
  if (!prodValueArg) {
    throw new Error('You must provide a prod value!');
  }

  // Add to all environments in parallel
  await addEnvVar({
    name: nameArg,
    devValue: devValueArg,
    prodValue: prodValueArg,
    // Don't automatically update the types when running directly
  });
  console.log('✔ The environment variable has been created in Vercel');

  process.exit(0);
}

// Otherwise, we'll collect all the necessary information to create the variable
rl.question(
  'What is the name of the environment variable that you need to add? For example, VERCEL_TOKEN...\n',
  (name) => {
    if (!name) {
      throw new Error('You must provide a name!');
    }

    rl.question(
      '\nWhat should the value of this variable be in all dev (non-production) environments?\n',
      (devValue) => {
        if (!devValue) {
          throw new Error('You must provide a dev value!');
        }

        rl.question(
          '\nWhat should the value of this variable be in all prod environments?\n',
          async (prodValue) => {
            if (!prodValue) {
              throw new Error('You must provide a prod value!');
            }

            // Add to all environments in parallel
            await addEnvVar({
              name,
              devValue,
              prodValue,
              shouldUpdateTypes: true,
            });
            rl.write('✔ The environment variable has been created in Vercel\n');

            rl.close();
          }
        );
      }
    );
  }
);
