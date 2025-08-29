import { slackConversationsUnarchiveTool } from '@/tools/slackConversationsUnarchive';
import { slackClient } from '@/utils/slackClient';

jest.mock('@/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackConversationsUnarchive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSlackClient.resolveChannelId.mockResolvedValue('C1234567890');
    (mockSlackClient as any).conversations = {
      info: jest.fn(),
      unarchive: jest.fn()
    };
  });

  it('should unarchive a channel successfully', async () => {
    (mockSlackClient as any).conversations.info.mockResolvedValue({
      ok: true,
      channel: {
        id: 'C1234567890',
        name: 'test-channel',
        is_archived: true,
        num_members: 5
      }
    });

    (mockSlackClient as any).conversations.unarchive.mockResolvedValue({ ok: true });

    const result = await slackConversationsUnarchiveTool.execute({
      channel: 'test-channel'
    });

    expect(result.success).toBe(true);
    expect(result.data.unarchived).toBe(true);
    expect(result.data.channel_name).toBe('test-channel');
    expect((mockSlackClient as any).conversations.unarchive).toHaveBeenCalledWith({
      channel: 'C1234567890'
    });
  });

  it('should handle channel not archived error', async () => {
    (mockSlackClient as any).conversations.info.mockResolvedValue({
      ok: true,
      channel: {
        id: 'C1234567890',
        name: 'test-channel',
        is_archived: false
      }
    });

    const result = await slackConversationsUnarchiveTool.execute({
      channel: 'test-channel'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Channel is not archived');
    expect((mockSlackClient as any).conversations.unarchive).not.toHaveBeenCalled();
  });

  it('should include analytics when requested', async () => {
    (mockSlackClient as any).conversations.info.mockResolvedValue({
      ok: true,
      channel: {
        id: 'C1234567890',
        name: 'test-channel',
        is_archived: true,
        num_members: 10,
        created: 1640995200
      }
    });

    (mockSlackClient as any).conversations.unarchive.mockResolvedValue({ ok: true });

    const result = await slackConversationsUnarchiveTool.execute({
      channel: 'test-channel',
      include_analytics: true
    });

    expect(result.success).toBe(true);
    expect(result.data.analytics).toBeDefined();
    expect(result.data.analytics.channel_info.member_count).toBe(10);
    expect(result.data.analytics.unarchive_timing).toBeDefined();
  });
});
