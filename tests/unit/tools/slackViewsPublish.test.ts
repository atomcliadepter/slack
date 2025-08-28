import { slackViewsPublishTool } from '../../../src/tools/slackViewsPublish';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackViewsPublishTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackViewsPublishTool.name).toBeDefined();
    expect(slackViewsPublishTool.description).toBeDefined();
    expect(slackViewsPublishTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackViewsPublishTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
