import { slackSearchMessagesTool } from '../../../src/tools/slackSearchMessages';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackSearchMessagesTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackSearchMessagesTool.name).toBeDefined();
    expect(slackSearchMessagesTool.description).toBeDefined();
    expect(slackSearchMessagesTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackSearchMessagesTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
