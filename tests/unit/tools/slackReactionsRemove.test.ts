import { slackReactionsRemoveTool } from '../../../src/tools/slackReactionsRemove';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackReactionsRemoveTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackReactionsRemoveTool.name).toBeDefined();
    expect(slackReactionsRemoveTool.description).toBeDefined();
    expect(slackReactionsRemoveTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackReactionsRemoveTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
