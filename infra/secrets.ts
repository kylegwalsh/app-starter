export const DATABASE_URL = new sst.Secret('DATABASE_URL');
export const DIRECT_DATABASE_URL = new sst.Secret('DIRECT_DATABASE_URL');

// Set the default secrets for the stage...
export const STAGE = new sst.Secret('STAGE', $app.stage);

export const secrets = [DATABASE_URL, DIRECT_DATABASE_URL, STAGE];
