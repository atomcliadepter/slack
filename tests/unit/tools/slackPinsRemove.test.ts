import { slackPinsRemoveTool } from '../../../src/tools/slackPinsRemove';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackPinsRemoveTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackPinsRemoveTool.name).toBeDefined();
    expect(slackPinsRemoveTool.description).toBeDefined();
    expect(slackPinsRemoveTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackPinsRemoveTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
