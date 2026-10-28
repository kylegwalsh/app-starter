import { analytics } from '@repo/analytics';

import { resolveMcpSession } from '@/ai/mcp/session';
import { db } from '@/db';
import { type TestMcpClient, mcpFactory, organizationFactory } from '@/tests/factories';

describe('Organization tools (MCP)', () => {
  let mcp: TestMcpClient;

  beforeEach(async () => {
    mcp = await mcpFactory.createClient({ organization: { name: 'Acme' } });
  });

  /** Creates another organization the test user belongs to */
  const joinOrganization = async (name: string) => {
    const organization = await organizationFactory.createOrganization({ name });
    await organizationFactory.createMembership({
      userId: mcp.user.id,
      organizationId: organization.id,
    });
    return organization;
  };

  describe('list-organizations', () => {
    it('lists every membership and marks the active organization', async () => {
      const globex = await joinOrganization('Globex');

      const result = await mcp.callTool('list-organizations');

      expect(result.isError).toBe(false);
      expect(result.text).toContain(`- **Acme** (${mcp.organization.id}) — active`);
      expect(result.text).toContain(`- Globex (${globex.id})`);
    });

    it("doesn't list organizations the user isn't a member of", async () => {
      await organizationFactory.createOrganization({ name: 'Initech' });

      const result = await mcp.callTool('list-organizations');

      expect(result.text).not.toContain('Initech');
    });
  });

  describe('switch-organization', () => {
    it('switches the active organization for the rest of the session', async () => {
      const globex = await joinOrganization('Globex');

      const result = await mcp.callTool('switch-organization', { organizationId: globex.id });

      expect(result).toEqual({
        isError: false,
        text: `Active organization set to **Globex** (${globex.id}).`,
      });
      // The next request in this session resolves to the new organization
      const nextSession = await resolveMcpSession({
        sessionId: mcp.session.id ?? '',
        userId: mcp.user.id,
      });
      expect(nextSession.organization.id).toBe(globex.id);
    });

    it("refuses organizations the user isn't a member of", async () => {
      const initech = await organizationFactory.createOrganization({ name: 'Initech' });

      const result = await mcp.callTool('switch-organization', { organizationId: initech.id });

      expect(result.isError).toBe(true);
      expect(result.text).toContain('You are not a member of that organization');
      const session = await db.mcpSession.findUniqueOrThrow({ where: { id: mcp.session.id } });
      expect(session.organizationId).toBe(mcp.organization.id);
    });

    it('treats a refusal as the caller’s mistake, not a failure to report', async () => {
      const initech = await organizationFactory.createOrganization({ name: 'Initech' });
      const capture = vi.spyOn(analytics, 'captureException');
      const track = vi.spyOn(analytics, 'mcpToolCalled');
      onTestFinished(() => {
        capture.mockRestore();
        track.mockRestore();
      });

      await mcp.callTool('switch-organization', { organizationId: initech.id });

      expect(capture).not.toHaveBeenCalled();
      const [event] = track.mock.calls[0] ?? [];
      expect(event).toMatchObject({ success: false, errorStatus: 403 });
    });
  });
});
