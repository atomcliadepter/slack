
import { slackGetUserInfoTool } from '../../src/tools/slackGetUserInfo';
import { skipIntegration, mockInvalidArgs } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Get User Info Integration Tests', () => {

  describe('Validation Tests', () => {
    test('should reject empty arguments', async () => {
      const result = await slackGetUserInfoTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should reject empty userId', async () => {
      const result = await slackGetUserInfoTool.execute(mockInvalidArgs.getUserInfo[1]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
  });

  describe('Integration Tests', () => {
    test('should get user info successfully with valid user ID', async () => {

      // Use a known user ID or get current bot user
      const result = await slackGetUserInfoTool.execute({
        userId: 'USLACKBOT' // Slackbot is always available
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.user).toBeDefined();
      expect(result.data.user.id).toBe('USLACKBOT');
      expect(result.data.user.name).toBe('slackbot');
    });

    test('should handle non-existent user gracefully', async () => {

      const result = await slackGetUserInfoTool.execute({
        userId: 'U9999999999' // Non-existent user ID
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('user_not_found');
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed user ID', async () => {

      const result = await slackGetUserInfoTool.execute({
        userId: 'invalid-user-id'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate user ID format', async () => {
      const result = await slackGetUserInfoTool.execute({
        userId: '123' // Too short
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });
});
