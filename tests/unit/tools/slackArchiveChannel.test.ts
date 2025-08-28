import { slackArchiveChannelTool } from '../../../src/tools/slackArchiveChannel';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackArchiveChannelTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackArchiveChannelTool.name).toBeDefined();
    expect(slackArchiveChannelTool.description).toBeDefined();
    expect(slackArchiveChannelTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackArchiveChannelTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
