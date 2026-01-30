import { checkCLIs } from './init.js';

const printFinalNotes = () => {
  console.log('--- Final Notes ---');
  console.log('You can start the app with: bun dev\n');

  console.log('✔ Setup complete! Happy coding!\n');
};

/** Initialize a user's local environment for an existing project */
const initExisting = () => {
  console.log('Preparing existing project setup...\n');

  // Check that all CLI tools are setup
  checkCLIs();

  // Print final notes
  printFinalNotes();

  // End the script
  process.exit(0);
};

initExisting();
