import { type TestSession, sessionFactory } from '@/tests/factories';

// Daytona without an API key
vi.mock('@/services/daytona', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/daytona')>();
  return { sandboxManager: { ...original.sandboxManager, isEnabled: false } };
});

describe('Uploads Router', () => {
  let api: TestSession['api'];

  beforeEach(async () => {
    ({ api } = await sessionFactory.createSession());
  });

  it('rejects files only code can open when the sandbox is disabled', async () => {
    const res = await api.uploads['create-upload-url'].$post({
      json: { fileName: 'data.json', fileType: 'application/json', fileSize: 100 },
    });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("application/json files aren't supported");
  });
});
