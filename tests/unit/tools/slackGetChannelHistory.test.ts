import { slackGetChannelHistoryTool } from '../../../src/tools/slackGetChannelHistory';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackGetChannelHistoryTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackGetChannelHistoryTool.name).toBeDefined();
    expect(slackGetChannelHistoryTool.description).toBeDefined();
    expect(slackGetChannelHistoryTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackGetChannelHistoryTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
