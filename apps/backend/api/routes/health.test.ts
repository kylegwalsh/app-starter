import { routerFactory } from '@/tests/factories';

describe('Health Router', () => {
  let api: Awaited<ReturnType<typeof routerFactory.createRouter>>['router'];

  beforeEach(async () => {
    const mock = await routerFactory.createRouter();
    api = mock.router;
  });

  it('returns ok status', async () => {
    const res = await api.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
