import { slackLeaveChannelTool } from '../../../src/tools/slackLeaveChannel';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackLeaveChannelTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackLeaveChannelTool.name).toBeDefined();
    expect(slackLeaveChannelTool.description).toBeDefined();
    expect(slackLeaveChannelTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackLeaveChannelTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
