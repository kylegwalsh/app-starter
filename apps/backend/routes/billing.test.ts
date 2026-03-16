import { trpcFactory } from '@/tests/factories';

// Mock stripe
const { mockStripe } = vi.hoisted(() => ({
  mockStripe: {
    invoices: {
      list: vi.fn(),
    },
    charges: {
      list: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
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

  describe('charge', () => {
    it('creates a checkout session and returns the url', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        url: 'https://checkout.stripe.com/test-session',
      });

      const result = await trpc.billing.charge({
        amount: 49.99,
        description: 'One-time setup fee',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result).toEqual({ url: 'https://checkout.stripe.com/test-session' });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          customer: 'test-customer-id',
          line_items: [
            expect.objectContaining({
              quantity: 1,
              price_data: expect.objectContaining({
                currency: 'usd',
                unit_amount: 4999,
                product_data: { name: 'One-time setup fee' },
              }),
            }),
          ],
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        }),
      );
    });

    it('passes undefined as customer when org has no stripe customer id', async () => {
      const { router: trpcNoCustomer } = await trpcFactory.createRouter({
        organization: { stripeCustomerId: null },
      });
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        url: 'https://checkout.stripe.com/test-session',
      });

      await trpcNoCustomer.billing.charge({
        amount: 10,
        description: 'Test',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: undefined }),
      );
    });

    it('converts dollars to cents correctly', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        url: 'https://checkout.stripe.com/x',
      });

      await trpc.billing.charge({
        amount: 1.5,
        description: 'Test',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 150 }) }),
          ],
        }),
      );
    });

    it('throws for non-positive amounts', async () => {
      await expect(
        trpc.billing.charge({
          amount: 0,
          description: 'Test',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow();
    });

    it('throws for invalid urls', async () => {
      await expect(
        trpc.billing.charge({
          amount: 10,
          description: 'Test',
          successUrl: '/relative/path',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getHistory', () => {
    it('returns an empty history when organization has no Stripe customer ID', async () => {
      const { router: trpcNoCustomer } = await trpcFactory.createRouter({
        organization: { stripeCustomerId: null },
      });
      const result = await trpcNoCustomer.billing.getHistory();
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
