import { log } from '@repo/logs';

import { db } from '@/db';

/** How long a claim survives without a heartbeat before another caller can take over. */
const LOCK_TTL_MS = 30_000;

/** Heartbeat cadence — short so a cancel stops the model quickly, and well under {@link LOCK_TTL_MS}. */
const HEARTBEAT_INTERVAL_MS = 3000;

/** The expiry for a freshly claimed or extended lock */
const nextExpiry = () => new Date(Date.now() + LOCK_TTL_MS);

/** A claimed lock, held by one producer until it's released, cleared or expires */
const createLease = (conversationId: string, claimedExpiry: Date) => {
  // The last expiry this holder wrote doubles as its token: a cancel nulls it and a later claim
  // writes a new one, so matching on it stops a superseded producer from extending or releasing
  // the new holder's lock
  let expiry = claimedExpiry;
  // Runs updates one at a time, so a heartbeat and a final check never race on `expiry`
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(update: () => Promise<T>) => {
    const next = queue.then(update);
    queue = next.catch(() => {});
    return next;
  };

  /** Pushes the expiry forward. Returns false if the lock is no longer ours (a cancel check) */
  const extend = () =>
    serialize(async () => {
      const nextValue = nextExpiry();
      const { count } = await db.conversation.updateMany({
        where: { id: conversationId, generatingUntil: expiry },
        data: { generatingUntil: nextValue },
      });
      if (count > 0) {
        expiry = nextValue;
      }
      return count > 0;
    });

  return {
    extend,
    /** Extends the lock on an interval, calling `onLost` once if it's no longer ours. Returns a stop function */
    startHeartbeat: (onLost: () => void) => {
      const interval = setInterval(async () => {
        try {
          if (!(await extend())) {
            clearInterval(interval);
            onLost();
          }
        } catch (error) {
          log.warn({ err: error, conversationId }, 'Lock heartbeat failed');
        }
      }, HEARTBEAT_INTERVAL_MS);
      return () => clearInterval(interval);
    },
    /** Releases the lock if it's still ours. Returns false if it was cleared or taken over */
    release: () =>
      serialize(async () => {
        const { count } = await db.conversation.updateMany({
          where: { id: conversationId, generatingUntil: expiry },
          data: { generatingUntil: null },
        });
        return count > 0;
      }),
  };
};

/** Per-conversation generation lock (`generatingUntil`): one response at a time, with a TTL */
export const conversationLock = {
  /** Atomically claims a free or stale lock. Returns its lease, or undefined if another producer holds it */
  claim: async (conversationId: string) => {
    const expiry = nextExpiry();
    const { count } = await db.conversation.updateMany({
      where: {
        id: conversationId,
        OR: [{ generatingUntil: null }, { generatingUntil: { lt: new Date() } }],
      },
      data: { generatingUntil: expiry },
    });
    return count > 0 ? createLease(conversationId, expiry) : undefined;
  },
  /** Clears whoever holds the lock (a cancel). Returns false if nothing was generating */
  clear: async (conversationId: string) => {
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
