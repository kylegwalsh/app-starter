import { db } from '@/db';

/** Regularly pings database to keep it awake */
export const handler = async () => {
  await db.$queryRaw`SELECT 1`;
};
