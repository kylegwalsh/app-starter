import { nanoid } from 'nanoid';
import { db } from '@/db';

/** Regularly pings database to keep it awake */
export const handler = async () => {
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

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Ok' }),
  };
};
