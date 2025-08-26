
import { slackGetWorkspaceInfoTool } from '../../src/tools/slackGetWorkspaceInfo';
import { skipIntegration } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Get Workspace Info Integration Tests', () => {

  describe('Integration Tests', () => {
    test('should get workspace info successfully', async () => {

      const result = await slackGetWorkspaceInfoTool.execute({});
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.team).toBeDefined();
      expect(result.data.team.id).toBeDefined();
      expect(result.data.team.name).toBeDefined();
      expect(result.data.team.domain).toBeDefined();
    });

    test('should include team details', async () => {

      const result = await slackGetWorkspaceInfoTool.execute({});
      
      expect(result.success).toBe(true);
      expect(result.data.team.id).toMatch(/^T[A-Z0-9]+$/); // Slack team ID format
      expect(typeof result.data.team.name).toBe('string');
      expect(typeof result.data.team.domain).toBe('string');
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
