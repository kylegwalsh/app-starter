import readline from 'node:readline';

import inquirer from 'inquirer';

// ---------- INPUT HELPERS ----------
/** Prompt the user for input */
export const promptUser = async (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

/** Prompt the user for a yes/no answer */
export const promptYesNo = async (question: string): Promise<boolean> => {
  while (true) {
    const rawAnswer = await promptUser(question);
    const answer = rawAnswer.trim().toLowerCase();
    if (['y', 'yes'].includes(answer)) return true;
    if (['n', 'no'].includes(answer)) return false;
    console.log("Please enter 'y' or 'n'.");
  }
};

/**
 * Prompt the user to select from a list of choices using arrow keys.
 * @param message The message to display
 * @param choices The list of choices (array of strings)
 * @returns The selected choice (string)
 */
export const promptSelect = async (message: string, choices: string[]): Promise<string> => {
  const response = await inquirer.prompt<{
    selected: string;
  }>([
    {
      type: 'list',
      name: 'selected',
      message,
      choices,
    },
  ]);
  return response.selected;
};
