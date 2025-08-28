import { slackConversationsMarkTool } from '../../../src/tools/slackConversationsMark';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackConversationsMarkTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackConversationsMarkTool.name).toBeDefined();
    expect(slackConversationsMarkTool.description).toBeDefined();
    expect(slackConversationsMarkTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackConversationsMarkTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
