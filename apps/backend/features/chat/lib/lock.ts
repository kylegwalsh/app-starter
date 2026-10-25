import { log } from '@repo/logs';

import { db } from '@/db';

/** How long a claim survives without a heartbeat before another caller can take over. */
const LOCK_TTL_MS = 30_000;

/** Heartbeat cadence — must be comfortably under {@link LOCK_TTL_MS}. */
const HEARTBEAT_INTERVAL_MS = 20_000;

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
  /** Extends the lock on an interval so it only expires if we die. Returns a stop function */
  startHeartbeat: (conversationId: string) => {
    const interval = setInterval(() => {
      extend(conversationId).catch((error: unknown) =>
        log.warn({ err: error, conversationId }, 'Lock heartbeat failed'),
      );
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
  /** Clears the lock only once it has expired, so an active producer's claim is never stomped. */
  releaseIfExpired: async (conversationId: string) => {
    await db.conversation.updateMany({
      where: { id: conversationId, generatingUntil: { lt: new Date() } },
      data: { generatingUntil: null },
    });
  },
  /** Whether a producer currently holds an unexpired lock */
  isHeld: async (conversationId: string) => {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { generatingUntil: true },
    });
    return !!conversation?.generatingUntil && conversation.generatingUntil > new Date();
  },
};
