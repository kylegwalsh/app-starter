import type { email } from '@repo/email';

import { auth } from '@/core';
import { type TestSession, sessionFactory } from '@/tests/factories';

const { mockSendContactEmail } = vi.hoisted(() => ({
  mockSendContactEmail: vi.fn<(typeof email)['sendContactEmail']>(),
}));

vi.mock('@repo/email', () => ({ email: { sendContactEmail: mockSendContactEmail } }));

describe('Contact Router', () => {
  let api: TestSession['api'];

  beforeEach(async () => {
    vi.clearAllMocks();
    const session = await sessionFactory.createSession();
    api = session.api;
  });

  describe('submit', () => {
    it('sends the notification email', async () => {
      const res = await api.contact.$post({
        json: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          company: 'Acme',
          message: 'Interested in a demo.',
        },
      });

      expect(mockSendContactEmail).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Acme',
        message: 'Interested in a demo.',
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
    });

    it('is available without a signed-in user', async () => {
      // Public route: the marketing site submits without a session
      vi.spyOn(auth.api, 'getSession').mockResolvedValue(null);

      const res = await api.contact.$post({
        json: { name: 'Jane Doe', email: 'jane@example.com', message: 'Interested in a demo.' },
      });

      expect(res.status).toBe(200);
    });

    it('rejects an invalid email', async () => {
      const res = await api.contact.$post({
        json: {
          name: 'Jane Doe',
          email: 'not-an-email',
          message: 'Interested in a demo.',
        },
      });

      expect(res.status).toBe(400);
      expect(mockSendContactEmail).not.toHaveBeenCalled();
    });

    it('surfaces notification failures', async () => {
      mockSendContactEmail.mockRejectedValueOnce(new Error('PostHog is down'));

      const res = await api.contact.$post({
        json: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Interested in a demo.',
        },
      });

      expect(res.status).toBe(500);
    });
  });
});
