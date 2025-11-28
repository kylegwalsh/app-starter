import {
  checkCLIs,
  getOrCreateStage,
  selectOrCreateAwsProfile,
} from './init.js';

const printFinalNotes = () => {
  console.log('--- Final Steps ---');
  console.log('You can start the app with: bun dev\n');

  console.log(
    '- Make sure you restart your terminal for your AWS profile changes to take effect.\n'
  );
  console.log('✔ Setup complete! Happy coding!\n');
};

/** Initialize a user's local environment for an existing project */
const initExisting = async () => {
  console.log('Preparing existing project setup...\n');

  // Check that all CLI tools are setup
  checkCLIs();

  // Get or create the user's personal environment stage
  await getOrCreateStage();

  // Select or create an AWS profile
  await selectOrCreateAwsProfile({ existing: true });

  // Print final notes
  printFinalNotes();
};

initExisting();
