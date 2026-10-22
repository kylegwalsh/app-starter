import { type TestSession, sessionFactory } from '@/tests/factories';

describe('Health Router', () => {
  let api: TestSession['api'];

  beforeEach(async () => {
    const session = await sessionFactory.createSession();
    api = session.api;
  });

  it('returns ok status', async () => {
    const result = await api.health.check();
    expect(result).toEqual({ status: 'ok' });
  });
});
