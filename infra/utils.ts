// ---------- DOMAIN ----------
/** The base domain for all deployed resources (example.com => app.example.com, etc) */
const baseDomain = '';

/** The list of stages that we will apply a custom domain to (not local stages) */
const stagesWithCustomDomains = ['prod', 'staging', 'dev'];

/** Retrieves the base domain to use for a given stage */
export const getDomainForStage = (stage: string) =>
  baseDomain && stagesWithCustomDomains.includes(stage)
    ? `${stage === 'prod' ? '' : `${stage}.`}${baseDomain}`
    : undefined;
