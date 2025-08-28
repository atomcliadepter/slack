import { slackListChannelsTool } from '../../../src/tools/slackListChannels';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackListChannelsTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackListChannelsTool.name).toBeDefined();
    expect(slackListChannelsTool.description).toBeDefined();
    expect(slackListChannelsTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackListChannelsTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
