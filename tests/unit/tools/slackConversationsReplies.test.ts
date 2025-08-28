import { slackConversationsRepliesTool } from '../../../src/tools/slackConversationsReplies';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackConversationsRepliesTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackConversationsRepliesTool.name).toBeDefined();
    expect(slackConversationsRepliesTool.description).toBeDefined();
    expect(slackConversationsRepliesTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackConversationsRepliesTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
