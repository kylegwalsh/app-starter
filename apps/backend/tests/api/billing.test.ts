import { trpcFactory } from '../factories';

// Mock stripe
const { mockStripe } = vi.hoisted(() => ({
  mockStripe: {
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    invoices: {
      list: vi.fn(),
    },
    charges: {
      list: vi.fn(),
    },
  },
}));
vi.mock('@/core/stripe', () => ({ stripe: mockStripe }));

// Test our router
describe('Billing Router', () => {
  let trpc: Awaited<ReturnType<typeof trpcFactory.createRouter>>['router'];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mock = await trpcFactory.createRouter({
      organization: { stripeCustomerId: 'test-customer-id' },
    });
    trpc = mock.router;
  });

  describe('getPortalUrl', () => {
    it('throws when organization has no Stripe customer ID', async () => {
      const { router: noStripeTrpc } = await trpcFactory.createRouter({
        organization: { stripeCustomerId: null },
      });

      await expect(noStripeTrpc.billing.getPortalUrl()).rejects.toThrow(
        'Organization does not have a Stripe customer ID',
      );
    });

    it('returns a billing portal URL when organization has a Stripe customer ID', async () => {
      const url = 'https://stripe.test/portal/session_123';
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({ url });

      const result = await trpc.billing.getPortalUrl();
      expect(result).toEqual({ url });
    });
  });

  describe('getHistory', () => {
    it('returns an empty history when organization has no Stripe customer ID', async () => {
      const result = await trpc.billing.getHistory();
      expect(result).toEqual({ history: [] });
    });

    it('returns combined and sorted history from invoices and charges', async () => {
      mockStripe.invoices.list.mockResolvedValueOnce({
        data: [
          {
            id: 'in_1',
            amount_paid: 5000,
            status: 'paid',
            description: null,
            created: 200,
            hosted_invoice_url: 'https://stripe.test/invoices/in_1',
          },
        ],
      });
      mockStripe.charges.list.mockResolvedValueOnce({
        data: [
          {
            id: 'ch_1',
            amount: 2500,
            status: 'succeeded',
            description: 'Test charge',
            created: 100,
            receipt_url: 'https://stripe.test/charges/ch_1',
          },
        ],
      });

      const { history } = await trpc.billing.getHistory();
      expect(history).toHaveLength(2);
      // Should be sorted desc by date, so invoice (created 200) first
      expect(history[0]).toMatchObject({
        id: 'in_1',
        type: 'invoice',
        amount: 50,
      });
      expect(history[1]).toMatchObject({
        id: 'ch_1',
        type: 'payment',
        amount: 25,
      });
    });

    it('returns empty history if Stripe APIs throw', async () => {
      mockStripe.invoices.list.mockRejectedValueOnce(new Error('stripe down'));

      const result = await trpc.billing.getHistory();
      expect(result).toEqual({ history: [] });
    });
  });
});
