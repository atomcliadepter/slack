import { slackSendMessageTool } from '../../../src/tools/slackSendMessage';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackSendMessageTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      chat: { postMessage: jest.fn() }
    };
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should send message successfully', async () => {
    mockClient.chat.postMessage.mockResolvedValue({
      ok: true,
      channel: 'C1234567890',
      ts: '1234567890.123456'
    });

    const result = await slackSendMessageTool.execute({
      channel: 'general',
      text: 'Hello World'
    });

    expect(result.success).toBe(true);
    expect(mockClient.chat.postMessage).toHaveBeenCalledWith({
      channel: 'general',
      text: 'Hello World'
    });
  });

  it('should handle errors', async () => {
    mockClient.chat.postMessage.mockRejectedValue(new Error('API Error'));

    const result = await slackSendMessageTool.execute({
      channel: 'general',
      text: 'Hello World'
    });

    expect(result.success).toBe(false);
  });
});
