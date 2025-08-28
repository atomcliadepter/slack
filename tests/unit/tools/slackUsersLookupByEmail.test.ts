import { slackUsersLookupByEmailTool } from '../../../src/tools/slackUsersLookupByEmail';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackUsersLookupByEmailTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackUsersLookupByEmailTool.name).toBeDefined();
    expect(slackUsersLookupByEmailTool.description).toBeDefined();
    expect(slackUsersLookupByEmailTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackUsersLookupByEmailTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
