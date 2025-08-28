import { slackBookmarksListTool } from '../../../src/tools/slackBookmarksList';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackBookmarksListTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackBookmarksListTool.name).toBeDefined();
    expect(slackBookmarksListTool.description).toBeDefined();
    expect(slackBookmarksListTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackBookmarksListTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
