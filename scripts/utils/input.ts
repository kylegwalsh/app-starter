import readline from 'node:readline';

import inquirer from 'inquirer';

// ---------- INPUT HELPERS ----------
/** Prompt the user for input */
export const promptUser = (question: string): Promise<string> => {
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
    if (['y', 'yes'].includes(answer)) {
      return true;
    }
    if (['n', 'no'].includes(answer)) {
      return false;
    }
    console.log("Please enter 'y' or 'n'.");
  }
};

/** Prompt the user to select from a list of choices  */
export const promptSelect = async <T extends 'list' | 'checkbox' = 'list'>({
  message,
  choices,
  type = 'list' as T,
}: {
  /** The message to display */
  message: string;
  /** The choices to display (array of strings or object mapping values to labels) */
  choices: string[] | Record<string, string>;
  /**
   * The type of select (list for single select or checkbox for multi-select)
   * @default 'list'
   */
  type?: T;
}): Promise<T extends 'list' ? string : string[]> => {
  const isObject = !Array.isArray(choices);
  const choiceList = isObject
    ? Object.keys(choices).map((value) => ({
        name: choices[value],
        value,
      }))
    : choices;

  const response = await inquirer.prompt<{
    selected: T extends 'list' ? string : string[];
  }>([
    {
      type,
      name: 'selected',
      message,
      choices: choiceList,
    },
  ]);
  return response.selected as T extends 'list' ? string : string[];
};
