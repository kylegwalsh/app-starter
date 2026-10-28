import { log } from '@repo/logs';

import { db } from '@/db';

/** How long a claim survives without a heartbeat before another caller can take over. */
const LOCK_TTL_MS = 30_000;

/** Heartbeat cadence — short so a cancel stops the model quickly, and well under {@link LOCK_TTL_MS}. */
const HEARTBEAT_INTERVAL_MS = 3000;

/** The expiry for a freshly claimed or extended lock */
const nextExpiry = () => new Date(Date.now() + LOCK_TTL_MS);

/** Pushes a held lock's expiry forward. Returns false if it was cleared (a cancel check) */
const extend = async (conversationId: string) => {
  const { count } = await db.conversation.updateMany({
    // `not: null` so a late call never resurrects a released lock
    where: { id: conversationId, generatingUntil: { not: null } },
    data: { generatingUntil: nextExpiry() },
  });
  return count > 0;
};

/** Per-conversation generation lock (`generatingUntil`): one response at a time, with a TTL */
export const conversationLock = {
  /** Atomically claims a free or stale lock. Returns false if another producer holds it */
  claim: async (conversationId: string) => {
    const { count } = await db.conversation.updateMany({
      where: {
        id: conversationId,
        OR: [{ generatingUntil: null }, { generatingUntil: { lt: new Date() } }],
      },
      data: { generatingUntil: nextExpiry() },
    });
    return count > 0;
  },
  extend,
  /** Extends the lock on an interval, calling `onLost` once if it was cleared. Returns a stop function */
  startHeartbeat: (conversationId: string, onLost: () => void) => {
    const interval = setInterval(async () => {
      try {
        if (!(await extend(conversationId))) {
          clearInterval(interval);
          onLost();
        }
      } catch (error) {
        log.warn({ err: error, conversationId }, 'Lock heartbeat failed');
      }
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  },
  /** Releases a held lock. Returns false if it was already cleared (e.g. by a cancel). */
  release: async (conversationId: string) => {
    const { count } = await db.conversation.updateMany({
      where: { id: conversationId, generatingUntil: { not: null } },
      data: { generatingUntil: null },
    });
    return count > 0;
  },
  /** Whether a lock expiry is still live (a producer is generating) */
  isActive: (generatingUntil: Date | null) =>
    generatingUntil !== null && generatingUntil > new Date(),
};
