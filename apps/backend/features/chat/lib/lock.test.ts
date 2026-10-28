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

  it('claims a free lock once', async () => {
    await expect(conversationLock.claim(conversationId)).resolves.toBe(true);
    await expect(conversationLock.claim(conversationId)).resolves.toBe(false);
    expect(conversationLock.isActive(await getExpiry())).toBe(true);
  });

  it('takes over a stale lock', async () => {
    await setExpiry(new Date(Date.now() - 1000));
    await expect(conversationLock.claim(conversationId)).resolves.toBe(true);
  });

  it('reports a cleared lock when extending (the cancel probe)', async () => {
    await conversationLock.claim(conversationId);
    await expect(conversationLock.extend(conversationId)).resolves.toBe(true);

    await expect(conversationLock.release(conversationId)).resolves.toBe(true);
    await expect(conversationLock.extend(conversationId)).resolves.toBe(false);
    await expect(conversationLock.release(conversationId)).resolves.toBe(false);
    expect(conversationLock.isActive(await getExpiry())).toBe(false);
  });

  it('treats an expired lock as inactive', () => {
    expect(conversationLock.isActive(null)).toBe(false);
    expect(conversationLock.isActive(new Date(Date.now() - 1000))).toBe(false);
    expect(conversationLock.isActive(new Date(Date.now() + 1000))).toBe(true);
  });

  it('calls onLost once the heartbeat finds the lock cleared', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    try {
      await conversationLock.claim(conversationId);
      const onLost = vi.fn<() => void>();
      const stop = conversationLock.startHeartbeat(conversationId, onLost);

      await vi.advanceTimersToNextTimerAsync();
      await vi.waitFor(async () => expect(await getExpiry()).not.toBeNull());
      expect(onLost).not.toHaveBeenCalled();

      await conversationLock.release(conversationId);
      await vi.advanceTimersToNextTimerAsync();
      await vi.waitFor(() => expect(onLost).toHaveBeenCalledOnce());
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
