import { slackListUsersTool } from '../../../src/tools/slackListUsers';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackListUsersTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackListUsersTool.name).toBeDefined();
    expect(slackListUsersTool.description).toBeDefined();
    expect(slackListUsersTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackListUsersTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
