import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";

// Promisify exec for async/await usage
const execAsync = promisify(exec);

/** Initializes everything we need to get started with this repo */
const init = () => {
  console.log("Setting up repo...");

  // TODO: Finish setup script
};

init();
