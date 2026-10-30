import { type TestSession, sessionFactory } from '@/tests/factories';

describe('Health Router', () => {
  let api: TestSession['api'];

  beforeEach(async () => {
    const session = await sessionFactory.createSession();
    api = session.api;
  });

  it('returns ok status', async () => {
    const res = await api.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
