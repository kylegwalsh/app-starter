# Backend Test Patterns

## Running Tests

Use the `/test-backend` skill to run tests. It accepts an optional file path argument:

- `/test-backend` — run all backend tests
- `/test-backend api/routes/billing.test.ts` — run a specific test file

## Rules

- **Co-location**: Test next to source (`api/routes/billing.ts` → `api/routes/billing.test.ts`). Never a separate test directory.
- **Database**: `import { db } from '@/db'` → isolated SQLite Prisma client (aliased in `vitest.config.ts`). Use like normal Prisma.
- **Router factory**: `apps/backend/tests/factories/router-factory.ts` provides router callers with default user + org.
- **Integration-style**: Exercise real routes + real DB. Mock only external services (e.g., Stripe).
- **Mocking**: Mock by concrete path (`@/core/stripe`), not barrels (`@/core`). Never mock `@repo/config`.
- **Isolation**: Each test independent. DB state reset between tests.
- **Errors**: Assert expected error types/messages for unhappy paths.

## Example

```typescript
import { db } from '@/db';
import { routerFactory } from '@/tests/factories';

const { mockStripe } = vi.hoisted(() => ({
  mockStripe: {
    billingPortal: { sessions: { create: vi.fn() } },
    invoices: { list: vi.fn() },
  },
}));
vi.mock('@/core/stripe', () => ({ stripe: mockStripe }));

describe('Billing Router', () => {
  let api: Awaited<ReturnType<typeof routerFactory.createRouter>>['router'];
  let organization: Awaited<ReturnType<typeof routerFactory.createRouter>>['organization'];

  beforeEach(async () => {
    vi.clearAllMocks();
    const mock = await routerFactory.createRouter();
    api = mock.router;
    organization = mock.organization;
  });

  it('returns the portal URL', async () => {
    await db.organization.update({
      where: { id: organization.id },
      data: { stripeCustomerId: 'cus_123' },
    });

    mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({
      url: 'https://billing.stripe.com/session_abc',
    });

    const result = await api.billing.getPortalUrl();
    expect(result).toEqual({ url: 'https://billing.stripe.com/session_abc' });
  });
});
```
