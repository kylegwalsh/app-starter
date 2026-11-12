// All of our secret environment variables
export const DATABASE_URL = new sst.Secret('DATABASE_URL');
export const DIRECT_DATABASE_URL = new sst.Secret('DIRECT_DATABASE_URL');

// Better Auth
export const BETTER_AUTH_SECRET = new sst.Secret('BETTER_AUTH_SECRET');

// AI
// export const ANTHROPIC_API_KEY = new sst.Secret('ANTHROPIC_API_KEY');
// export const OPENAI_API_KEY = new sst.Secret('OPENAI_API_KEY');
// export const GOOGLE_GENERATIVE_AI_API_KEY = new sst.Secret('GOOGLE_GENERATIVE_AI_API_KEY');

// Langfuse
export const LANGFUSE_SECRET_KEY = new sst.Secret('LANGFUSE_SECRET_KEY');
export const LANGFUSE_PUBLIC_KEY = new sst.Secret('LANGFUSE_PUBLIC_KEY');

// PostHog
// export const POSTHOG_SECRET_KEY = new sst.Secret('POSTHOG_SECRET_KEY');

// Stripe
// export const STRIPE_SECRET_KEY = new sst.Secret('STRIPE_SECRET_KEY');
// export const STRIPE_WEBHOOK_SECRET = new sst.Secret('STRIPE_WEBHOOK_SECRET');

// Daytona
export const DAYTONA_API_KEY = new sst.Secret('DAYTONA_API_KEY');

// The current stage
export const STAGE = new sst.Secret('STAGE', $app.stage);
