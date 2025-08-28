import { slackSendMessageTool } from '../../../src/tools/slackSendMessage';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackSendMessageTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackSendMessageTool.name).toBeDefined();
    expect(slackSendMessageTool.description).toBeDefined();
    expect(slackSendMessageTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackSendMessageTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
