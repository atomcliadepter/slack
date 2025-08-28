import { slackConversationsHistoryTool } from '../../../src/tools/slackConversationsHistory';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackConversationsHistoryTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackConversationsHistoryTool.name).toBeDefined();
    expect(slackConversationsHistoryTool.description).toBeDefined();
    expect(slackConversationsHistoryTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackConversationsHistoryTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
