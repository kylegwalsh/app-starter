// All of our secret environment variables
export const DATABASE_URL = new sst.Secret('DATABASE_URL');
export const DIRECT_DATABASE_URL = new sst.Secret('DIRECT_DATABASE_URL');

// Better Stack
export const BETTER_STACK_SOURCE_TOKEN = new sst.Secret('BETTER_STACK_SOURCE_TOKEN');
export const BETTER_STACK_INGESTING_URL = new sst.Secret('BETTER_STACK_INGESTING_URL');

// Set the default secrets for the stage...
export const STAGE = new sst.Secret('STAGE', $app.stage);

export const secrets = [
  DATABASE_URL,
  DIRECT_DATABASE_URL,
  STAGE,
  BETTER_STACK_SOURCE_TOKEN,
  BETTER_STACK_INGESTING_URL,
];
