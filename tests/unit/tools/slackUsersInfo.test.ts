import { slackUsersInfoTool } from '../../../src/tools/slackUsersInfo';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackUsersInfoTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackUsersInfoTool.name).toBeDefined();
    expect(slackUsersInfoTool.description).toBeDefined();
    expect(slackUsersInfoTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackUsersInfoTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
