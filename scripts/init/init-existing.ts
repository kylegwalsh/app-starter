import { checkCLIs, getOrCreateStage } from './init.js';

/** Initialize a user's local environment for an existing project */
const initExisting = async () => {
  console.log('Preparing existing project setup...\n');

  // Check that all CLI tools are setup
  checkCLIs();

  // Get or create the user's personal environment stage
  await getOrCreateStage();

  console.log('✔ Setup complete! Happy coding!\n');
};

void initExisting();
