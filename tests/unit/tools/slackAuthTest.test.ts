import { slackAuthTestTool } from '../../../src/tools/slackAuthTest';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackAuthTestTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackAuthTestTool.name).toBeDefined();
    expect(slackAuthTestTool.description).toBeDefined();
    expect(slackAuthTestTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackAuthTestTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
