import { Config, type StackContext } from 'sst/constructs';

/** Manages all of our secret environment variables */
export const SecretsStack = ({ app, stack }: StackContext) => {
  // Our available secrets
  const secrets = {
    // Database
    DATABASE_URL: new Config.Secret(stack, 'DATABASE_URL'),
    DIRECT_DATABASE_URL: new Config.Secret(stack, 'DIRECT_DATABASE_URL'),

    // Better Auth
    BETTER_AUTH_SECRET: new Config.Secret(stack, 'BETTER_AUTH_SECRET'),

    // Axiom
    AXIOM_TOKEN: new Config.Secret(stack, 'AXIOM_TOKEN'),
    AXIOM_DATASET: new Config.Secret(stack, 'AXIOM_DATASET'),

    // AI
    // ANTHROPIC_API_KEY: new Config.Secret(stack, "ANTHROPIC_API_KEY"),
    // OPENAI_API_KEY: new Config.Secret(stack, "OPENAI_API_KEY"),
    // GOOGLE_GENERATIVE_AI_API_KEY: new Config.Secret(stack, "GOOGLE_GENERATIVE_AI_API_KEY"),

    // Langfuse
    // LANGFUSE_SECRET_KEY: new Config.Secret(stack, "LANGFUSE_SECRET_KEY"),
    // LANGFUSE_PUBLIC_KEY: new Config.Secret(stack, "LANGFUSE_PUBLIC_KEY"),

    // Loops
    // LOOPS_API_KEY: new Config.Secret(stack, 'LOOPS_API_KEY'),

    // Stripe
    // STRIPE_SECRET_KEY: new Config.Secret(stack, 'STRIPE_SECRET_KEY'),
    // STRIPE_WEBHOOK_SECRET: new Config.Secret(stack, 'STRIPE_WEBHOOK_SECRET'),
  };

  // Ensure all variables are accessible in our functions
  app.addDefaultFunctionBinding(Object.values(secrets));

  return secrets;
};
