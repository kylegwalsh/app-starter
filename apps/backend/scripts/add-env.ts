import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

// This script is used to add environment variables to our prod and dev environments in the cloud

// ---------- HELPERS ----------

/** Create an interface to get user input */
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

/** Add an env var to the cloud */
export const addEnvVar = ({
  name,
  devValue,
  prodValue,
}: {
  name: string;
  devValue: string;
  prodValue: string;
}): void => {
  // Set dev/fallback value
  execSync(`sst secret set ${name} "${devValue}" --fallback`, {
    stdio: 'inherit',
  });

  // Set production value
  execSync(`sst secret set ${name} "${prodValue}" --stage prod`, {
    stdio: 'inherit',
  });
};

// ---------- DIRECT INVOCATION ----------
// If we are running the script directly, we should run the logic below (this check avoids running it on simple imports)
const currentFile = fileURLToPath(import.meta.url).replace(/\.ts$/, '');
const executedFile = process.argv[1].replace(/\.ts$/, '');
if (currentFile === executedFile) {
  // Check for command line arguments
  const [name, devValue, prodValue] = process.argv.slice(2);

  // Non-interactive mode: if all arguments provided, add the secret directly
  if (name && devValue && prodValue) {
    addEnvVar({ name, devValue, prodValue });
    process.exit(0);
  }

  // Interactive mode: prompt for values
  rl.question(
    'What is the name of the secret you need to add? (e.g., STRIPE_SECRET_KEY)\n',
    (name) => {
      if (!name?.trim()) {
        console.error('❌ Secret name is required');
        rl.close();
        process.exit(1);
      }

      rl.question(
        '\nWhat should the value of this variable be in all dev (non-production) environments?\n',
        (devValue) => {
          if (!devValue?.trim()) {
            throw new Error('❌ Dev value is required');
          }

          rl.question(
            '\nWhat should the value of this variable be in all prod environments?\n',
            (prodValue) => {
              if (!prodValue?.trim()) {
                throw new Error('❌ Production value is required');
              }

              addEnvVar({ name: name.trim(), devValue, prodValue });
              rl.write(
                "✔ The environment variable has been created in AWS. Don't forget to add the new variable to the infra/secrets.ts file as well!",
              );
              rl.close();
            },
          );
        },
      );
    },
  );
}
