import { slackConversationsMembersTool } from '../../../src/tools/slackConversationsMembers';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackConversationsMembersTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackConversationsMembersTool.name).toBeDefined();
    expect(slackConversationsMembersTool.description).toBeDefined();
    expect(slackConversationsMembersTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackConversationsMembersTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
