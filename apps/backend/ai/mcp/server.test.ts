import { z } from 'zod';

// oxlint-disable-next-line no-namespace -- Namespace import to check every registered tool
import * as registry from '@/ai/tools';
import type { AiTool } from '@/ai/utils';
import { type TestMcpClient, mcpFactory } from '@/tests/factories';

// These tests cover the server's wiring and derive every tool from the registry, so they don't
// change as tools are added. Each tool's own behavior is tested next to it (features/*/tools.test.ts).
// The registry's tools have specific input types, so widen them like the server does
const allTools = Object.values(registry) as AiTool[];
const mcpTools = allTools.filter((tool) => tool.consumers.includes('mcp'));
const chatOnlyTool = allTools.find((tool) => !tool.consumers.includes('mcp'));

describe('MCP Server', () => {
  let mcp: TestMcpClient;

  beforeEach(async () => {
    mcp = await mcpFactory.createClient();
  });

  describe('tools/list', () => {
    it('exposes exactly the tools that opt into MCP', async () => {
      const { tools } = await mcp.client.listTools();

      // Chat-only tools (e.g. the sandbox tools) must not leak onto the MCP surface
      expect(tools.map((tool) => tool.name).toSorted()).toEqual(
        mcpTools.map((tool) => tool.name).toSorted(),
      );
    });

    it('gives every tool a description and read-only/destructive hints', async () => {
      const { tools } = await mcp.client.listTools();

      // Includes the name so a failure shows which tool is missing metadata
      for (const tool of tools) {
        expect({
          name: tool.name,
          description: tool.description,
          readOnlyHint: typeof tool.annotations?.readOnlyHint,
          destructiveHint: typeof tool.annotations?.destructiveHint,
        }).toEqual({
          name: tool.name,
          description: expect.stringMatching(/\S/),
          readOnlyHint: 'boolean',
          destructiveHint: 'boolean',
        });
      }
    });

    it('publishes each input schema with the same parameters as its Zod shape', async () => {
      const { tools } = await mcp.client.listTools();

      for (const tool of mcpTools) {
        const shape = tool.inputSchema ?? {};
        const listed = tools.find((listedTool) => listedTool.name === tool.name);
        const properties = Object.keys(listed?.inputSchema.properties ?? {});

        expect({
          name: tool.name,
          type: listed?.inputSchema.type,
          properties: properties.toSorted(),
          required: (listed?.inputSchema.required ?? []).toSorted(),
        }).toEqual({
          name: tool.name,
          type: 'object',
          properties: Object.keys(shape).toSorted(),
          // A parameter is required when its schema rejects a missing value
          required: Object.entries(shape)
            .filter(([, schema]) => !z.object({ value: schema }).safeParse({}).success)
            .map(([key]) => key)
            .toSorted(),
        });
      }
    });
  });

  describe('tools/call', () => {
    it('returns invalid input as an error result the model can read', async () => {
      const { tools } = await mcp.client.listTools();
      const tool = tools.find((listedTool) => listedTool.inputSchema.required?.length);
      if (!tool) {
        throw new Error('No MCP tool has a required parameter to test input validation with');
      }

      const result = await mcp.callTool(tool.name, {});

      expect(result.isError).toBe(true);
      expect(result.text).toContain(tool.inputSchema.required?.[0]);
    });

    it('returns handler errors as an error result instead of failing the request', async () => {
      const [tool] = mcpTools;
      if (!tool) {
        throw new Error('No MCP tools are registered');
      }
      const handler = vi.spyOn(tool, 'handler').mockRejectedValue(new Error('boom'));
      onTestFinished(() => handler.mockRestore());

      // Fill required parameters so the call reaches the handler
      const args = Object.fromEntries(Object.keys(tool.inputSchema ?? {}).map((key) => [key, 'x']));
      const result = await mcp.callTool(tool.name, args);

      expect(result).toEqual({ isError: true, text: 'boom' });
    });

    it('rejects tools that are not exposed via MCP', async () => {
      const tool = chatOnlyTool;
      if (!tool) {
        throw new Error('No chat-only tools are registered');
      }

      const result = await mcp.callTool(tool.name);

      expect(result.isError).toBe(true);
      expect(result.text).toContain(tool.name);
    });
  });
});
