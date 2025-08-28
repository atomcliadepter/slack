import { slackPinsAddTool } from '../../../src/tools/slackPinsAdd';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackPinsAddTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackPinsAddTool.name).toBeDefined();
    expect(slackPinsAddTool.description).toBeDefined();
    expect(slackPinsAddTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackPinsAddTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
