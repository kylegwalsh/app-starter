import { nanoid } from 'nanoid';
import { db } from '@/db';

/** Regularly pings database to keep it awake */
export default async function handler() {
  // Create and delete a record to ensure the database remains awake
  const item = await db.verification.create({
    data: {
      identifier: nanoid(),
      value: nanoid(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  await db.verification.delete({
    where: {
      id: item.id,
    },
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
