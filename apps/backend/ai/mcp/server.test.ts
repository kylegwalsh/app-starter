import { analytics } from '@repo/analytics';
import { z } from 'zod';

// oxlint-disable-next-line no-namespace -- Namespace import to check every registered tool
import * as registry from '@/ai/tools';
import { type AiTool, createTool } from '@/ai/utils';
import { ForbiddenError } from '@/api/error';
import { type TestMcpClient, mcpFactory } from '@/tests/factories';

const mcpTools = Object.values(registry).filter((tool) => tool.consumers.includes('mcp'));

describe('MCP Server', () => {
  // Rules every real tool must follow; they don't change as tools are added
  describe('registry', () => {
    let mcp: TestMcpClient;

    beforeEach(async () => {
      mcp = await mcpFactory.createClient();
    });

    it('exposes exactly the tools that opt into MCP', async () => {
      const { tools } = await mcp.client.listTools();

      // Chat-only tools (e.g. the sandbox tools) must not leak onto the MCP surface
      expect(tools.map((tool) => tool.name).toSorted()).toEqual(
        mcpTools.map((tool) => tool.name).toSorted(),
      );
    });

    // One block per tool, so a failure names the tool that broke the rule
    describe.each(mcpTools)('$name', (tool) => {
      /** The tool as the server lists it */
      const listTool = async () => {
        const { tools } = await mcp.client.listTools();
        return tools.find((listed) => listed.name === tool.name);
      };

      it('has a description and read-only/destructive hints', async () => {
        const listed = await listTool();

        expect(listed?.description?.trim()).toBeTruthy();
        expect(typeof listed?.annotations?.readOnlyHint).toBe('boolean');
        expect(typeof listed?.annotations?.destructiveHint).toBe('boolean');
      });

      it('publishes its input schema with the same parameters as its Zod shape', async () => {
        const listed = await listTool();
        const shape = tool.inputSchema ?? {};
        // A parameter is required when its schema rejects a missing value
        const required = Object.entries(shape)
          .filter(([, schema]) => !z.object({ value: schema }).safeParse({}).success)
          .map(([key]) => key);

        expect(listed?.inputSchema.type).toBe('object');
        expect(Object.keys(listed?.inputSchema.properties ?? {}).toSorted()).toEqual(
          Object.keys(shape).toSorted(),
        );
        expect((listed?.inputSchema.required ?? []).toSorted()).toEqual(required.toSorted());
      });
    });
  });

  // How the server handles a call, tested against tools built for these tests
  describe('tool calls', () => {
    let mcp: TestMcpClient;
    let handler: ReturnType<typeof vi.fn<(args: { message: string }) => Promise<string>>>;

    beforeEach(async () => {
      handler = vi.fn<(args: { message: string }) => Promise<string>>().mockResolvedValue('Echoed');
      const tools = [
        createTool({
          name: 'test-tool',
          description: 'A tool for testing',
          inputSchema: { message: z.string().describe('Text to echo') },
          annotations: { readOnlyHint: true, destructiveHint: false },
          consumers: ['mcp'],
          handler: (args) => handler(args),
        }),
        createTool({
          name: 'chat-only-tool',
          description: 'A tool only chat can use',
          annotations: { readOnlyHint: true, destructiveHint: false },
          consumers: ['chat'],
          handler: async () => 'Never called',
        }),
      ] satisfies AiTool[];
      mcp = await mcpFactory.createClient({ tools });
    });

    /** Spies on analytics for one test */
    const spyOnAnalytics = () => {
      const track = vi.spyOn(analytics, 'mcpToolCalled');
      const capture = vi.spyOn(analytics, 'captureException');
      onTestFinished(() => {
        track.mockRestore();
        capture.mockRestore();
      });
      return { track, capture };
    };

    it("returns the handler's result", async () => {
      const result = await mcp.callTool('test-tool', { message: 'hi' });

      expect(result).toEqual({ isError: false, text: 'Echoed' });
      expect(handler).toHaveBeenCalledWith({ message: 'hi' });
    });

    it('returns invalid input as an error result the model can read', async () => {
      const result = await mcp.callTool('test-tool', {});

      expect(result.isError).toBe(true);
      expect(result.text).toContain('message');
      expect(handler).not.toHaveBeenCalled();
    });

    it('tracks each call as an "MCP Tool Called" event', async () => {
      const { track } = spyOnAnalytics();

      await mcp.callTool('test-tool', { message: 'hi' });

      const [event] = track.mock.calls[0] ?? [];
      expect(event).toMatchObject({
        userId: mcp.user.id,
        organizationId: mcp.organization.id,
        sessionId: mcp.session.id,
        toolName: 'test-tool',
        success: true,
        errorStatus: undefined,
      });
      expect(typeof event?.durationMs).toBe('number');
    });

    it('returns an unexpected error as an error result and reports it', async () => {
      const { track, capture } = spyOnAnalytics();
      handler.mockRejectedValue(new Error('boom'));

      const result = await mcp.callTool('test-tool', { message: 'hi' });

      expect(result).toEqual({ isError: true, text: 'boom' });
      expect(capture).toHaveBeenCalled();
      expect(track.mock.calls[0]?.[0]).toMatchObject({ success: false, errorStatus: 500 });
    });

    it('returns a caller error as an error result without reporting it', async () => {
      const { track, capture } = spyOnAnalytics();
      handler.mockRejectedValue(new ForbiddenError('Not yours'));

      const result = await mcp.callTool('test-tool', { message: 'hi' });

      expect(result).toEqual({ isError: true, text: 'Not yours' });
      expect(capture).not.toHaveBeenCalled();
      expect(track.mock.calls[0]?.[0]).toMatchObject({ success: false, errorStatus: 403 });
    });

    it('rejects tools that are not exposed via MCP', async () => {
      const result = await mcp.callTool('chat-only-tool');

      expect(result.isError).toBe(true);
      expect(result.text).toContain('chat-only-tool');
    });
  });
});
