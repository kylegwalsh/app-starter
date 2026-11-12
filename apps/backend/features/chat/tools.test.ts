import { toAiSdkTools } from '@/ai/sdk';
import { type TestSession, sessionFactory } from '@/tests/factories';

// Daytona without an API key
vi.mock('@/services/daytona', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/daytona')>();
  return { sandboxManager: { ...original.sandboxManager, isEnabled: false } };
});

describe('Chat sandbox tools', () => {
  it("aren't offered to the model when Daytona isn't configured", async () => {
    const { user, organization }: TestSession = await sessionFactory.createSession();
    const tools = Object.keys(toAiSdkTools({ user, organization, conversationId: 'conv' }));

    for (const name of ['run-code', 'write-file', 'read-file', 'execute-command']) {
      expect(tools).not.toContain(name);
    }
    // Tools that don't need the sandbox are unaffected
    expect(tools).toContain('list-organizations');
  });
});
