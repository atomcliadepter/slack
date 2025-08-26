import { slackArchiveChannelTool } from '@/tools/slackArchiveChannel';

describe('slackArchiveChannelTool', () => {
  describe('Tool Configuration', () => {
    it('should have correct tool metadata', () => {
      expect(slackArchiveChannelTool.name).toBe('slack_archive_channel');
      expect(slackArchiveChannelTool.description).toContain('Archive a Slack channel');
      expect(slackArchiveChannelTool.inputSchema.type).toBe('object');
      expect(slackArchiveChannelTool.inputSchema.required).toEqual(['channel']);
    });

    it('should have comprehensive input schema properties', () => {
      const properties = slackArchiveChannelTool.inputSchema.properties;
      
      expect(properties.channel).toBeDefined();
      expect(properties.validate_permissions).toBeDefined();
      expect(properties.check_already_archived).toBeDefined();
      expect(properties.prevent_general_archive).toBeDefined();
      expect(properties.prevent_important_channels).toBeDefined();
      expect(properties.member_notification).toBeDefined();
      expect(properties.notification_message).toBeDefined();
      expect(properties.include_channel_info).toBeDefined();
      expect(properties.include_member_count).toBeDefined();
      expect(properties.include_archive_analytics).toBeDefined();
      expect(properties.confirmation_required).toBeDefined();
      expect(properties.auto_retry).toBeDefined();
      expect(properties.retry_attempts).toBeDefined();
      expect(properties.retry_delay_ms).toBeDefined();
      expect(properties.backup_messages).toBeDefined();
      expect(properties.backup_message_count).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate required channel parameter', async () => {
      const result = await slackArchiveChannelTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel: Required');
    });

    it('should validate channel format', async () => {
      const result = await slackArchiveChannelTool.execute({
        channel: 'invalid-channel-format!',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid channel format');
    });

    it('should validate retry attempts range', async () => {
      const result = await slackArchiveChannelTool.execute({
        channel: 'C1234567890',
        retry_attempts: 10, // Above maximum
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('retry_attempts');
    });

    it('should validate backup message count range', async () => {
      const result = await slackArchiveChannelTool.execute({
        channel: 'C1234567890',
        backup_message_count: 200, // Above maximum
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('backup_message_count');
    });
  });
});
