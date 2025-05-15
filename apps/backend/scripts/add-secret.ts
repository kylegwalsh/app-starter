import {
  execSync,
  ExecSyncOptionsWithBufferEncoding,
} from "node:child_process";
import * as readline from "node:readline";

// This script is used to add environment variables to our prod and dev environments in the cloud

/** Create an interface to get user input */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/** Common config to use for all exec commands */
const baseExecConfig: ExecSyncOptionsWithBufferEncoding = {
  stdio: "inherit",
};

// Collect all the necessary information to create the variable
rl.question(
  "What is the name of the environment variable that you need to add? For example, VERCEL_TOKEN...\n",
  (name) => {
    if (!name) throw new Error("You must provide a name!");

    rl.question(
      "\nWhat should the value of this variable be in all dev (non-production) environments?\n",
      (devValue) => {
        if (!devValue) throw new Error("You must provide a dev value!");

        rl.question(
          "\nWhat should the value of this variable be in all prod environments?\n",
          (prodValue) => {
            if (!prodValue) throw new Error("You must provide a prod value!");

            // Update the variable value for the dev environments
            execSync(
              `sst secret set ${name} "${devValue}" --fallback`,
              baseExecConfig,
            );
            // Update the variable value for the prod environments
            execSync(
              `sst secret set ${name} "${prodValue}" --stage prod`,
              baseExecConfig,
            );

            // Remind the user to also add the variable to the config file
            rl.write(
              "The environment variable has been created in AWS! Don't forget to add the new variable to the infra/SecretStack file as well!",
            );
            rl.close();
          },
        );
      },
    );
  },
);
