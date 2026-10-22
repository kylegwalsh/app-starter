import type { email } from '@repo/email';

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
      const result = await api.contact.submit({
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Acme',
        message: 'Interested in a demo.',
      });

      expect(mockSendContactEmail).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        company: 'Acme',
        message: 'Interested in a demo.',
      });
      expect(result).toEqual({ success: true });
    });

    it('rejects an invalid email', async () => {
      await expect(
        api.contact.submit({
          name: 'Jane Doe',
          email: 'not-an-email',
          message: 'Interested in a demo.',
        }),
      ).rejects.toThrow('Input validation failed');

      expect(mockSendContactEmail).not.toHaveBeenCalled();
    });

    it('surfaces notification failures', async () => {
      mockSendContactEmail.mockRejectedValueOnce(new Error('Loops is down'));

      await expect(
        api.contact.submit({
          name: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Interested in a demo.',
        }),
      ).rejects.toThrow('Loops is down');
    });
  });
});
