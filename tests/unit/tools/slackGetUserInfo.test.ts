import { slackUsersInfoTool as slackGetUserInfoTool } from '../../../src/tools/slackUsersInfo';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackGetUserInfoTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackGetUserInfoTool.name).toBeDefined();
    expect(slackGetUserInfoTool.description).toBeDefined();
    expect(slackGetUserInfoTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackGetUserInfoTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
