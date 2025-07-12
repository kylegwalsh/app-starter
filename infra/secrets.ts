// All of our secret environment variables
export const DATABASE_URL = new sst.Secret('DATABASE_URL');
export const DIRECT_DATABASE_URL = new sst.Secret('DIRECT_DATABASE_URL');

// Better Auth
export const BETTER_AUTH_SECRET = new sst.Secret('BETTER_AUTH_SECRET');

// Axiom
export const AXIOM_TOKEN = new sst.Secret('AXIOM_TOKEN');
export const AXIOM_DATASET = new sst.Secret('AXIOM_DATASET');

// AI
// export const ANTHROPIC_API_KEY = new sst.Secret('ANTHROPIC_API_KEY');
// export const OPENAI_API_KEY = new sst.Secret('OPENAI_API_KEY');
// export const GOOGLE_GENERATIVE_AI_API_KEY = new sst.Secret('GOOGLE_GENERATIVE_AI_API_KEY');

// Langfuse
export const LANGFUSE_SECRET_KEY = new sst.Secret('LANGFUSE_SECRET_KEY');
export const LANGFUSE_PUBLIC_KEY = new sst.Secret('LANGFUSE_PUBLIC_KEY');

// Set the default secrets for the stage...
export const STAGE = new sst.Secret('STAGE', $app.stage);
