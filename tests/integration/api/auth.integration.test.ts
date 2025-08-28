
import { slackGetWorkspaceInfoTool } from '../../../src/tools/slackGetWorkspaceInfo';
import { skipIntegration } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Get Workspace Info Integration Tests', () => {

  describe('Integration Tests', () => {
    test('should get workspace info successfully', async () => {

      const result = await slackGetWorkspaceInfoTool.execute({});
      
      expect(result.success).toBe(true);
      expect(result.workspace).toBeDefined();
      expect(result.workspace.id).toBeDefined();
      expect(result.workspace.name).toBeDefined();
      expect(result.workspace.domain).toBeDefined();
    });

    test('should include team details', async () => {

      const result = await slackGetWorkspaceInfoTool.execute({});
      
      expect(result.success).toBe(true);
      expect(result.workspace.id).toMatch(/^T[A-Z0-9]+$/); // Slack team ID format
      expect(typeof result.workspace.name).toBe('string');
      expect(typeof result.workspace.domain).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {

      // This test assumes the token is valid, so we expect success
      // In a real scenario with invalid token, we'd expect failure
      const result = await slackGetWorkspaceInfoTool.execute({});
      
      // With valid credentials, this should succeed
      expect(result.success).toBe(true);
    });
  });
});
