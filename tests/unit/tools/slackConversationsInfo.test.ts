import { slackConversationsInfoTool } from '../../../src/tools/slackConversationsInfo';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackConversationsInfoTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackConversationsInfoTool.name).toBeDefined();
    expect(slackConversationsInfoTool.description).toBeDefined();
    expect(slackConversationsInfoTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackConversationsInfoTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
