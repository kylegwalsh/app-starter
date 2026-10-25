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

  it('claims a free lock once', async () => {
    await expect(conversationLock.claim(conversationId)).resolves.toBe(true);
    await expect(conversationLock.claim(conversationId)).resolves.toBe(false);
    await expect(conversationLock.isHeld(conversationId)).resolves.toBe(true);
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
    await expect(conversationLock.isHeld(conversationId)).resolves.toBe(false);
  });

  it('only sweeps expired locks', async () => {
    await conversationLock.claim(conversationId);
    await conversationLock.releaseIfExpired(conversationId);
    await expect(conversationLock.isHeld(conversationId)).resolves.toBe(true);

    await setExpiry(new Date(Date.now() - 1000));
    await conversationLock.releaseIfExpired(conversationId);
    const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
    expect(conversation?.generatingUntil).toBeNull();
  });
});
