// ---------- HELPERS ----------
/** Which environment the app is running in */
let env = 'local';
switch (process.env.VERCEL_ENV) {
  case 'production':
    env = 'prod';
    break;
  case 'preview':
    env = 'dev';
    break;
  default:
    break;
}

/** Whether we're running against production resources */
const isProd = env === 'prod';
/** Whether we're running locally */
const isLocal = env === 'local';

// ---------- MAIN CONFIG ----------
/** The configuration object that defines global settings for the app */
export const config = {
  /** Which environment the app is running in */
  env,
  /** Whether we're running locally */
  isLocal,
  /** Whether the application is using production resources */
  isProd,
  /** Some details regarding the project */
  app: {
    /** The name of the project */
    name: 'My App',
    /** The primary domain for the project */
    domain: 'linkfactoryai.com',
    /** The url of the project (found differently for frontend and backend) */
    // TODO: Change to actual url
    url: 'http://localhost:3000',
  },
  /** Details for our backend API */
  api: {
    /** The URL of our own API (found differently for frontend and backend) */
    // TODO: Change to actual url
    url: 'http://localhost:5000',
  },
  /** The configuration for PostHog (our analytics system) */
  posthog: {
    /** Whether posthog is enabled */
    isEnabled: !isLocal,
    /** The PostHog API key */
    apiKey: isProd
      ? 'phc_LE5qHtqyJtBrzG4vRkfTY5OKmc3bBhEf7u8OEPyneCD'
      : 'phc_xKfOXqc9QAqX5E1KIepSG9EcG2FddQWvupGTvogQ0AH',
  },
  /** The configuration for crisp (our chat system) */
  crisp: {
    /** The crisp chat website ID */
    websiteId: '',
  },
  /** The configuration for our Loops (our email system) */
  loops: {
    /** The transactional emails we support */
    transactional: {
      /** The transactional email for reset password */
      resetPassword: 'cmddvjz0v1hmexb0inad4bz0h',
    },
  },
  /** The configuration for Stripe (our payment system) */
  stripe: {
    /** The Stripe publishable key */
    publishableKey: isProd
      ? ''
      : 'pk_test_51Rr8XGF1kcHuFeSjRYuUsOPbO4vHqodx3ilCrCzk18ijECQFqbo5N29ZwLU9gaFmEkto0b0OyoqLAjlcnEygxf3M00a89ydOqu',
  },
};
