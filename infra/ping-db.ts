// Pings our db every 3 days to keep it awake
export const keepDatabaseAwakeCron = new sst.aws.Cron('keepDatabaseAwakeCron', {
  schedule: 'rate(3 days)',
  function: 'apps/backend/functions/crons/keep-database-awake.handler',
});
