import { slackAuthTestTool } from '../../../src/tools/slackAuthTest';
import { slackClient } from '../../../src/utils/slackClient';
import { ErrorRecovery } from '../../../src/utils/errorRecovery';

jest.mock('../../../src/utils/slackClient');
jest.mock('../../../src/utils/errorRecovery');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;
const mockRecovery = ErrorRecovery as jest.Mocked<typeof ErrorRecovery>;

describe('slackAuthTestTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = { auth: { test: jest.fn() } } as any;
    mockSlackClient.getClient.mockReturnValue(mockClient);
    mockRecovery.executeWithRetry.mockImplementation(fn => fn());
  });

  it('should have correct tool metadata', () => {
    expect(slackAuthTestTool.name).toBeDefined();
    expect(slackAuthTestTool.description).toBeDefined();
    expect(slackAuthTestTool.inputSchema).toBeDefined();
  });

  it('should execute successfully', async () => {
    mockClient.auth.test.mockResolvedValue({ ok: true });
    const result = await slackAuthTestTool.execute({});
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(mockRecovery.executeWithRetry).toHaveBeenCalled();
  });

  it('retries on transient failure', async () => {
    mockClient.auth.test
      .mockRejectedValueOnce({ code: 'rate_limited' })
      .mockResolvedValue({ ok: true });

    mockRecovery.executeWithRetry.mockImplementation(async fn => {
      try {
        return await fn();
      } catch {
        return await fn();
      }
    });

    const result = await slackAuthTestTool.execute({});
    expect(result.success).toBe(true);
    expect(mockClient.auth.test).toHaveBeenCalledTimes(2);
    expect(mockRecovery.executeWithRetry).toHaveBeenCalled();
  });
});
