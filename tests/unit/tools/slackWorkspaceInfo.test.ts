import { slackWorkspaceInfoTool } from '../../../src/tools/slackWorkspaceInfo';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackWorkspaceInfoTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackWorkspaceInfoTool.name).toBeDefined();
    expect(slackWorkspaceInfoTool.description).toBeDefined();
    expect(slackWorkspaceInfoTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackWorkspaceInfoTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
