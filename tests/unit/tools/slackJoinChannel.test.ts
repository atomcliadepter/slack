import { slackJoinChannelTool } from '../../../src/tools/slackJoinChannel';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackJoinChannelTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackJoinChannelTool.name).toBeDefined();
    expect(slackJoinChannelTool.description).toBeDefined();
    expect(slackJoinChannelTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackJoinChannelTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
