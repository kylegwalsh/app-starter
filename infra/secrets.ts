// All of our secret environment variables
export const DATABASE_URL = new sst.Secret('DATABASE_URL');
export const DIRECT_DATABASE_URL = new sst.Secret('DIRECT_DATABASE_URL');

// Axiom
export const AXIOM_TOKEN = new sst.Secret('AXIOM_TOKEN');
export const AXIOM_DATASET = new sst.Secret('AXIOM_DATASET');

// Set the default secrets for the stage...
export const STAGE = new sst.Secret('STAGE', $app.stage);
