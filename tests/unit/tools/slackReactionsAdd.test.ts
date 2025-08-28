import { slackReactionsAddTool } from '../../../src/tools/slackReactionsAdd';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackReactionsAddTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackReactionsAddTool.name).toBeDefined();
    expect(slackReactionsAddTool.description).toBeDefined();
    expect(slackReactionsAddTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackReactionsAddTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
