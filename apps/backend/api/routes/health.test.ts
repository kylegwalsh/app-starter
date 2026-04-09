import { routerFactory } from '@/tests/factories';

describe('Health Router', () => {
  let api: Awaited<ReturnType<typeof routerFactory.createRouter>>['router'];

  beforeEach(async () => {
    const mock = await routerFactory.createRouter();
    api = mock.router;
  });

  it('returns ok status', async () => {
    const result = await api.health.check();
    expect(result).toEqual({ status: 'ok' });
  });
});
