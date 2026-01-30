import { db } from '@/db';

/** Regularly pings database to keep it awake */
export default async function handler() {
  await db.$queryRaw`SELECT 1`;
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
