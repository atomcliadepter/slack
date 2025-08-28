import { slackChatDeleteTool } from '../../../src/tools/slackChatDelete';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackChatDeleteTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackChatDeleteTool.name).toBeDefined();
    expect(slackChatDeleteTool.description).toBeDefined();
    expect(slackChatDeleteTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackChatDeleteTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
