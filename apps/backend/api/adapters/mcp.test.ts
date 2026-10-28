import { analytics } from '@repo/analytics';
import { z } from 'zod';

import { db } from '@/db';
import { organizationFactory, userFactory } from '@/tests/factories';

import { handleMcpRequest, mcpDiscovery } from './mcp';

/** Builds a JSON-RPC request to the MCP endpoint, optionally within a session */
const rpc = (body: Record<string, unknown>, sessionId?: string) =>
  new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(sessionId ? { 'mcp-session-id': sessionId, 'mcp-protocol-version': '2025-06-18' } : {}),
    },
    body: JSON.stringify(body),
  });

/** The handshake an MCP client opens a connection with */
const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.2.3' },
  },
};

describe('MCP adapter', () => {
  let userId: string;
  let organizationId: string;

  beforeEach(async () => {
    const [user, organization] = await Promise.all([
      userFactory.createUser(),
      organizationFactory.createOrganization(),
    ]);
    await organizationFactory.createMembership({
      userId: user.id,
      organizationId: organization.id,
    });
    userId = user.id;
    organizationId = organization.id;
  });

  /** Spies on the connection event for one test */
  const spyOnConnected = () => {
    const track = vi.spyOn(analytics, 'mcpClientConnected');
    onTestFinished(() => track.mockRestore());
    return track;
  };

  it('tracks a client connecting, with its name and version', async () => {
    const track = spyOnConnected();

    const res = await handleMcpRequest(rpc(initialize), userId);

    expect(res.status).toBe(200);
    const sessionId = res.headers.get('mcp-session-id');
    const [event] = track.mock.calls[0] ?? [];
    expect(event).toEqual({
      userId,
      organizationId,
      sessionId,
      clientName: 'test-client',
      clientVersion: '1.2.3',
    });
    // The session is created during the handshake
    const session = await db.mcpSession.findUnique({ where: { id: sessionId ?? '' } });
    expect(session).toMatchObject({ userId, organizationId });
  });

  it("doesn't track requests within an existing session", async () => {
    const connected = await handleMcpRequest(rpc(initialize), userId);
    const sessionId = connected.headers.get('mcp-session-id') ?? '';
    const track = spyOnConnected();

    const res = await handleMcpRequest(
      rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, sessionId),
      userId,
    );

    expect(res.status).toBe(200);
    expect(track).not.toHaveBeenCalled();
  });

  it('still completes the handshake when the connection cannot be tracked', async () => {
    // A user without an organization has no session to attribute the event to
    const user = await userFactory.createUser();
    const track = spyOnConnected();

    const res = await handleMcpRequest(rpc(initialize), user.id);

    expect(res.status).toBe(200);
    expect(res.headers.get('mcp-session-id')).toBeTruthy();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('MCP discovery', () => {
  it('advertises an authorization server whose metadata is discoverable at its issuer (RFC 8414)', async () => {
    const resourceRes = await mcpDiscovery.request('/oauth-protected-resource');
    const resource = z
      .object({ authorization_servers: z.tuple([z.string()]) })
      .parse(await resourceRes.json());
    const [authorizationServer] = resource.authorization_servers;

    // Clients fetch metadata by inserting the well-known path before the issuer's path
    const { pathname } = new URL(authorizationServer);
    const metadataRes = await mcpDiscovery.request(`/oauth-authorization-server${pathname}`);
    const metadata = z.object({ issuer: z.string() }).parse(await metadataRes.json());

    expect(metadataRes.status).toBe(200);
    expect(metadata.issuer).toBe(authorizationServer);
  });
});
