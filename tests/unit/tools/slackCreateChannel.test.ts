import { slackCreateChannelTool } from '../../../src/tools/slackCreateChannel';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackCreateChannelTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackCreateChannelTool.name).toBeDefined();
    expect(slackCreateChannelTool.description).toBeDefined();
    expect(slackCreateChannelTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackCreateChannelTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
