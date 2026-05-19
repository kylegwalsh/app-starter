// ---------- DOMAIN ----------
/** The base domain for all deployed resources (example.com => app.example.com, etc) */
const baseDomain: string = 'odinlabs.dev';

/** The final domain (includes the stage as well to differentiate between environments) */
export const domain = baseDomain
  ? `${$app.stage === 'prod' ? '' : `${$app.stage}.`}${baseDomain}`
  : undefined;
