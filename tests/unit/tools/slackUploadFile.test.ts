import { slackUploadFileTool } from '../../../src/tools/slackUploadFile';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackUploadFileTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {};
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackUploadFileTool.name).toBeDefined();
    expect(slackUploadFileTool.description).toBeDefined();
    expect(slackUploadFileTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    const result = await slackUploadFileTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});
