import { routerFactory } from '@/tests/factories';

// Mock stripe
const { mockStripe } = vi.hoisted(() => ({
  mockStripe: {
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
  let api: Awaited<ReturnType<typeof routerFactory.createRouter>>['router'];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mock = await routerFactory.createRouter({
      organization: { stripeCustomerId: 'test-customer-id' },
    });
    api = mock.router;
  });

  describe('getHistory', () => {
    it('returns an empty history when organization has no Stripe customer ID', async () => {
      const result = await api.billing.getHistory();
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

      const { history } = await api.billing.getHistory();
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

      const result = await api.billing.getHistory();
      expect(result).toEqual({ history: [] });
    });
  });
});
