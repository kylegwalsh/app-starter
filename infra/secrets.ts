export const DATABASE_URL = new sst.Secret("DATABASE_URL");
export const DIRECT_DATABASE_URL = new sst.Secret("DIRECT_DATABASE_URL");
export const BEDROCK_ACCESS_KEY_ID = new sst.Secret("BEDROCK_ACCESS_KEY_ID");
export const BEDROCK_SECRET_KEY = new sst.Secret("BEDROCK_SECRET_KEY");

// Set the default secrets for the stage...
export const STAGE = new sst.Secret("STAGE", $app.stage);

export const secrets = [
  DATABASE_URL,
  DIRECT_DATABASE_URL,
  BEDROCK_ACCESS_KEY_ID,
  BEDROCK_SECRET_KEY,
  STAGE,
];
