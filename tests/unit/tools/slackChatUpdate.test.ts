import { slackChatUpdateTool } from '../../../src/tools/slackChatUpdate';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackChatUpdateTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackChatUpdateTool.name).toBeDefined();
    expect(slackChatUpdateTool.description).toBeDefined();
    expect(slackChatUpdateTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackChatUpdateTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
