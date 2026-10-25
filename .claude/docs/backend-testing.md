# Backend Test Patterns

## Running Tests

Use the `/test-backend` skill to run tests. It accepts an optional file path argument:

- `/test-backend` — run all backend tests
- `/test-backend features/billing/routes.test.ts` — run a specific test file

## Rules

- **Co-location**: Test next to source (`features/billing/routes.ts` → `features/billing/routes.test.ts`). Never a separate test directory.
- **Database**: `import { db } from '@/db'` → isolated SQLite Prisma client (aliased in `vitest.config.ts`). Use like normal Prisma.
- **Session factory**: `apps/backend/tests/factories/session-factory.ts` creates a signed-in session (user + org + api client).
- **Integration-style**: Exercise real routes + real DB. Mock only external services (e.g., Stripe).
- **Mocking**: Mock by concrete path (`@/services/stripe`), not barrels (`@/services`). Never mock `@repo/config`.
- **Isolation**: Each test independent. DB state reset between tests.
- **Errors**: Assert expected error types/messages for unhappy paths.

## Example

```typescript
import { db } from '@/db';
import { type TestSession, sessionFactory } from '@/tests/factories';

const { mockStripe } = vi.hoisted(() => ({
  mockStripe: {
    billingPortal: { sessions: { create: vi.fn() } },
    invoices: { list: vi.fn() },
  },
}));
vi.mock('@/services/stripe', () => ({ stripe: mockStripe }));

describe('Billing Router', () => {
  let api: TestSession['api'];
  let organization: TestSession['organization'];

  beforeEach(async () => {
    vi.clearAllMocks();
    const session = await sessionFactory.createSession();
    api = session.api;
    organization = session.organization;
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
