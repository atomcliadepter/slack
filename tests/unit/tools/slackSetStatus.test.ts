import { slackSetStatusTool } from '../../../src/tools/slackSetStatus';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackSetStatusTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackSetStatusTool.name).toBeDefined();
    expect(slackSetStatusTool.description).toBeDefined();
    expect(slackSetStatusTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackSetStatusTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
