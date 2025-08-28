import { slackEventsTailTool } from '../../../src/tools/slackEventsTail';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackEventsTailTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackEventsTailTool.name).toBeDefined();
    expect(slackEventsTailTool.description).toBeDefined();
    expect(slackEventsTailTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackEventsTailTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
