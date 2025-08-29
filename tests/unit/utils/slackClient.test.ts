import { EnhancedSlackClient, slackClient } from '../../../src/utils/slackClient';

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

  afterAll(() => {
    slackClient.stopCleanup();
  });

  it('should initialize client', () => {
    const client = slackClient.getClient();
    expect(client).toBeDefined();
  });

  it('should resolve channel ID', async () => {
    const result = await slackClient.resolveChannelId('general');
    expect(result).toBe('C1234567890');
  });

  it('removes expired cache entries in background', () => {
    jest.useFakeTimers();
    const client = new EnhancedSlackClient({ cacheTtl: 1000 });
    // Directly set cache entry
    (client as any).cache.set('temp', { data: 'value', timestamp: Date.now() });

    // Advance time beyond TTL to trigger cleanup
    jest.advanceTimersByTime(1100);

    expect((client as any).cache.has('temp')).toBe(false);

    client.stopCleanup();
    jest.useRealTimers();
  });
});
