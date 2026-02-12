// ---------- DOMAIN ----------
/** The base domain for all deployed resources (example.com => app.example.com, etc) */
const baseDomain: string = '';

/** The list of stages that we will apply a custom domain to (not local stages) */
const stagesWithCustomDomains = ['prod', 'staging', 'dev'];

/** The final domain (includes the stage as well to differentiate between environments) */
export const domain =
  baseDomain && stagesWithCustomDomains.includes($app.stage)
    ? `${$app.stage === 'prod' ? '' : `${$app.stage}.`}${baseDomain}`
    : undefined;
