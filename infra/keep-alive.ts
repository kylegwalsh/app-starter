// Pings our db every 3 days to keep it awake
export const keepAliveCron = new sst.aws.Cron('keepAliveCron', {
  schedule: 'rate(3 days)',
  function: 'apps/backend/functions/crons/keep-alive.handler',
});
