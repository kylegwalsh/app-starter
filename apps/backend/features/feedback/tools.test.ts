import { analytics } from '@repo/analytics';

import { type TestMcpClient, mcpFactory } from '@/tests/factories';

describe('Feedback tools (MCP)', () => {
  let mcp: TestMcpClient;

  beforeEach(async () => {
    mcp = await mcpFactory.createClient();
  });

  describe('submit-feedback', () => {
    it('records the feedback as a "Feedback Submitted" event for MCP', async () => {
      const track = vi.spyOn(analytics, 'feedbackSubmitted');
      onTestFinished(() => track.mockRestore());

      const result = await mcp.callTool('submit-feedback', {
        feedbackType: 'feature-request',
        comment: 'list-organizations should show my role',
        toolName: 'list-organizations',
      });

      expect(result).toEqual({
        isError: false,
        text: 'Thanks, your feedback was sent to the team.',
      });
      expect(track).toHaveBeenCalledWith({
        userId: mcp.user.id,
        organizationId: mcp.organization.id,
        feature: 'mcp',
        feedbackType: 'feature-request',
        comment: 'list-organizations should show my role',
        toolName: 'list-organizations',
      });
    });

    it('requires a comment', async () => {
      const track = vi.spyOn(analytics, 'feedbackSubmitted');
      onTestFinished(() => track.mockRestore());

      const result = await mcp.callTool('submit-feedback', { feedbackType: 'praise' });

      expect(result.isError).toBe(true);
      expect(result.text).toContain('comment');
      expect(track).not.toHaveBeenCalled();
    });

    it('rejects an unknown feedback type', async () => {
      const result = await mcp.callTool('submit-feedback', {
        feedbackType: 'up',
        comment: 'Great tools',
      });

      expect(result.isError).toBe(true);
      expect(result.text).toContain('feedbackType');
    });
  });
});
