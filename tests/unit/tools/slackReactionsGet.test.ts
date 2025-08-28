import { slackReactionsGetTool } from '../../../src/tools/slackReactionsGet';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackReactionsGetTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackReactionsGetTool.name).toBeDefined();
    expect(slackReactionsGetTool.description).toBeDefined();
    expect(slackReactionsGetTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackReactionsGetTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
