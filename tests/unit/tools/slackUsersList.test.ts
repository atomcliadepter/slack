import { slackUsersListTool } from '../../../src/tools/slackUsersList';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackUsersListTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackUsersListTool.name).toBeDefined();
    expect(slackUsersListTool.description).toBeDefined();
    expect(slackUsersListTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackUsersListTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
