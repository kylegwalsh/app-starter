import { db } from '@/db';
import { type TestSession, sessionFactory } from '@/tests/factories';

import { conversationLock } from './lock';

describe('conversationLock', () => {
  let conversationId: string;

  beforeEach(async () => {
    const { user, organization }: TestSession = await sessionFactory.createSession();
    const conversation = await db.conversation.create({
      data: { userId: user.id, organizationId: organization.id },
    });
    conversationId = conversation.id;
  });

  /** Sets the lock's expiry directly (e.g. to simulate a producer that died) */
  const setExpiry = async (generatingUntil: Date | null) =>
    db.conversation.update({ where: { id: conversationId }, data: { generatingUntil } });

  /** Reads the lock's current expiry */
  const getExpiry = async () => {
    const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
    return conversation?.generatingUntil ?? null;
  };

  /** Claims the lock, failing the test if it's already held */
  const claim = async () => {
    const lease = await conversationLock.claim(conversationId);
    if (!lease) {
      throw new Error('Expected to claim the lock');
    }
    return lease;
  };

  it('claims a free lock once', async () => {
    await claim();
    await expect(conversationLock.claim(conversationId)).resolves.toBeUndefined();
    expect(conversationLock.isActive(await getExpiry())).toBe(true);
  });

  it('takes over a stale lock', async () => {
    await setExpiry(new Date(Date.now() - 1000));
    await expect(conversationLock.claim(conversationId)).resolves.toBeDefined();
  });

  it('reports a cleared lock when extending (the cancel probe)', async () => {
    const lease = await claim();
    await expect(lease.extend()).resolves.toBe(true);

    await expect(conversationLock.clear(conversationId)).resolves.toBe(true);
    await expect(lease.extend()).resolves.toBe(false);
    await expect(lease.release()).resolves.toBe(false);
    await expect(conversationLock.clear(conversationId)).resolves.toBe(false);
    expect(conversationLock.isActive(await getExpiry())).toBe(false);
  });

  it("never extends or releases a newer holder's lock after a cancel", async () => {
    const stopped = await claim();
    await conversationLock.clear(conversationId);
    const next = await claim();

    // The stopped producer finds the lock isn't its own, and can't free it
    await expect(stopped.extend()).resolves.toBe(false);
    await expect(stopped.release()).resolves.toBe(false);
    expect(conversationLock.isActive(await getExpiry())).toBe(true);

    await expect(next.extend()).resolves.toBe(true);
    await expect(next.release()).resolves.toBe(true);
  });

  it('keeps the lock when a heartbeat and a final check extend at once', async () => {
    const lease = await claim();
    await expect(Promise.all([lease.extend(), lease.extend()])).resolves.toEqual([true, true]);
  });

  it('treats an expired lock as inactive', () => {
    expect(conversationLock.isActive(null)).toBe(false);
    expect(conversationLock.isActive(new Date(Date.now() - 1000))).toBe(false);
    expect(conversationLock.isActive(new Date(Date.now() + 1000))).toBe(true);
  });

  it('calls onLost once the heartbeat finds the lock cleared', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      const lease = await claim();
      const onLost = vi.fn<() => void>();
      const stop = lease.startHeartbeat(onLost);

      await vi.advanceTimersToNextTimerAsync();
      await vi.waitFor(async () => expect(await getExpiry()).not.toBeNull());
      expect(onLost).not.toHaveBeenCalled();

      await conversationLock.clear(conversationId);
      await vi.advanceTimersToNextTimerAsync();
      await vi.waitFor(() => expect(onLost).toHaveBeenCalledOnce());
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
