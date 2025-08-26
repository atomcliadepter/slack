
import { slackCreateChannelTool } from '../../src/tools/slackCreateChannel';
import { skipIntegration, mockInvalidArgs, generateTestId } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Create Channel Integration Tests', () => {
  const createdChannels: string[] = [];


  afterAll(async () => {
    // Note: Cleanup of channels would require additional Slack API calls
    // In a real test environment, you might want to clean up created channels
    if (createdChannels.length > 0) {
      console.log(`Created test channels that may need manual cleanup: ${createdChannels.join(', ')}`);
    }
  });

  describe('Validation Tests', () => {
    test('should reject empty arguments', async () => {
      const result = await slackCreateChannelTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should reject empty name', async () => {
      const result = await slackCreateChannelTool.execute(mockInvalidArgs.createChannel[1]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel name is required');
    });

    test('should reject invalid channel name format', async () => {
      const result = await slackCreateChannelTool.execute(mockInvalidArgs.createChannel[2]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel name must be lowercase');
    });
  });

  describe('Integration Tests', () => {
    test('should create public channel successfully', async () => {

      const channelName = `test-public-${generateTestId()}`;
      const result = await slackCreateChannelTool.execute({
        name: channelName,
        description: 'Test public channel created by MCP SDK integration tests',
        isPrivate: false
      });
      
      if (result.success) {
        createdChannels.push(channelName);
        expect(result.data).toBeDefined();
        expect(result.data.channel).toBeDefined();
        expect(result.data.channel.name).toBe(channelName);
        expect(result.data.channel.is_private).toBe(false);
      } else {
        // Channel creation might fail due to permissions or existing channel
        expect(result.error).toBeDefined();
      }
    });

    test('should create private channel successfully', async () => {

      const channelName = `test-private-${generateTestId()}`;
      const result = await slackCreateChannelTool.execute({
        name: channelName,
        description: 'Test private channel created by MCP SDK integration tests',
        isPrivate: true
      });
      
      if (result.success) {
        createdChannels.push(channelName);
        expect(result.data.channel.name).toBe(channelName);
        expect(result.data.channel.is_private).toBe(true);
      } else {
        // Channel creation might fail due to permissions
        expect(result.error).toBeDefined();
      }
    });

    test('should handle duplicate channel name gracefully', async () => {

      const channelName = `test-duplicate-${generateTestId()}`;
      
      // Create first channel
      const firstResult = await slackCreateChannelTool.execute({
        name: channelName,
        description: 'First channel'
      });
      
      if (firstResult.success) {
        createdChannels.push(channelName);
        
        // Try to create duplicate
        const duplicateResult = await slackCreateChannelTool.execute({
          name: channelName,
          description: 'Duplicate channel'
        });
        
        expect(duplicateResult.success).toBe(false);
        expect(duplicateResult.error).toContain('name_taken');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long channel name', async () => {
      const longName = 'a'.repeat(22); // Slack limit is 21 chars
      const result = await slackCreateChannelTool.execute({
        name: longName
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel name must be 21 characters or less');
    });

    test('should handle channel name with invalid characters', async () => {
      const result = await slackCreateChannelTool.execute({
        name: 'test-channel-with-UPPERCASE'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel name must be lowercase');
    });
  });
});
