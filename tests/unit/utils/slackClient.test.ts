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
    users: { list: jest.fn() },
  })),
}));

describe('slackClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should resolve user ID', async () => {
    jest.spyOn(slackClient, 'getUserInfo').mockResolvedValue({
      ok: true,
      user: { id: 'U1234567890' }
    } as any);

    const result = await slackClient.resolveUserId('testuser');
    expect(result).toBe('U1234567890');
  });
});
