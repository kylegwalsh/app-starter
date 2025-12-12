import { Cron, type StackContext } from 'sst/constructs';

/** Pings our db occasionally to keep it awake */
export const PingDbStack = ({ stack }: StackContext) => {
  new Cron(stack, 'keepDatabaseAwakeCron', {
    schedule: 'rate(3 days)',
    job: 'apps/backend/functions/crons/keep-database-awake.handler',
  });
};
