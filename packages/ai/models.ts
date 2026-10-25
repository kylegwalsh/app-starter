import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
// import { createAnthropic } from '@ai-sdk/anthropic';
// import { createGoogleGenerativeAI } from '@ai-sdk/google';
// import { createOpenAI } from '@ai-sdk/openai';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

// ---------- PROVIDERS ----------
const bedrock = createAmazonBedrock({
  // We can inherit our AWS function permissions using this method
  credentialProvider: fromNodeProviderChain(),
  region: 'us-east-1',
});
// const anthropic = createAnthropic({
//   apiKey: env.ANTHROPIC_API_KEY,
// });
// const openai = createOpenAI({
//   apiKey: env.OPENAI_API_KEY,
// });
// const google = createGoogleGenerativeAI({
//   apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
// });

// ---------- MODELS ----------
/** Our available AI models */
export const models = {
  bedrock: {
    'claude-haiku-5-5': bedrock('us.anthropic.claude-haiku-5-5'),
    'claude-sonnet-5-5': bedrock('us.anthropic.claude-sonnet-5-5'),
    'claude-opus-5-5': bedrock('us.anthropic.claude-opus-5-5'),
  },
  // anthropic: {
  //   'claude-haiku-5-5': anthropic('claude-haiku-5-5'),
  //   'claude-sonnet-5-5': anthropic('claude-sonnet-5-5'),
  //   'claude-opus-5-5': anthropic('claude-opus-5-5'),
  // },
  // openai: {
  //   'gpt-5': openai('gpt-5'),
  //   'gpt-5-mini': openai('gpt-5-mini'),
  // },
  // google: {
  //   'gemini-2.5-flash': google('gemini-2.5-flash'),
  // },
};

/** The default model to use for AI generation */
export const defaultModel = models.bedrock['claude-haiku-5-5'];
