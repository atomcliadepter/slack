import { slackClient } from '../../../src/utils/slackClient';

// Mock WebClient
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    auth: { test: jest.fn() },
    conversations: { list: jest.fn() },
    users: { list: jest.fn() },
  })),
}));

describe('slackClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize client', () => {
    const client = slackClient.getClient();
    expect(client).toBeDefined();
  });

  it('should resolve channel ID', async () => {
    const result = await slackClient.resolveChannelId('general');
    expect(result).toBe('general');
  });
});
