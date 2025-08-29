import { slackClient } from '../../../src/utils/slackClient';

// Mock WebClient
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: jest.fn() },
    conversations: { 
      list: jest.fn().mockResolvedValue({
        ok: true,
        channels: [
          { id: 'C1234567890', name: 'general' }
        ]
      }),
      info: jest.fn().mockResolvedValue({
        ok: true,
        channel: { id: 'C1234567890', name: 'general' }
      })
    },
    users: { list: jest.fn(), info: jest.fn() },
  })),
}));

describe('slackClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    slackClient.clearCache();
    // Mock the getChannelInfo method
    jest.spyOn(slackClient, 'getChannelInfo').mockResolvedValue({
      success: true,
      channel: { id: 'C1234567890', name: 'general' }
    });
  });

  it('should initialize client', () => {
    const client = slackClient.getClient();
    expect(client).toBeDefined();
  });

  it('should resolve channel ID', async () => {
    const result = await slackClient.resolveChannelId('general');
    expect(result).toBe('C1234567890');
  });

  it('should resolve user ID across paginated responses', async () => {
    const client: any = slackClient.getClient();
    (client.users.list as jest.Mock)
      .mockResolvedValueOnce({
        members: [{ id: 'U1', name: 'someone' }],
        response_metadata: { next_cursor: 'abc' },
      })
      .mockResolvedValueOnce({
        members: [{ id: 'U123', name: 'john' }],
        response_metadata: { next_cursor: '' },
      });

    (client.users.info as jest.Mock).mockResolvedValue({
      ok: true,
      user: { id: 'U123', name: 'john' },
    });

    const result = await slackClient.resolveUserId('john');
    expect(result).toBe('U123');
    expect((client.users.list as jest.Mock).mock.calls.length).toBe(2);
  });
});
