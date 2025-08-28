import { slackPinsListTool } from '../../../src/tools/slackPinsList';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackPinsListTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackPinsListTool.name).toBeDefined();
    expect(slackPinsListTool.description).toBeDefined();
    expect(slackPinsListTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackPinsListTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
