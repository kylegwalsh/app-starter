/** Pings our db every 3 days to keep it awake */
export const keepAliveCron = new sst.aws.CronV2('keepAliveCron', {
  schedule: 'rate(3 days)',
  function: 'apps/backend/lambda/crons/keep-alive.handler',
});
