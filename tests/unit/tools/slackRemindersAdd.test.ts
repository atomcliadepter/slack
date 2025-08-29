import { slackRemindersAddTool } from '@/tools/slackRemindersAdd';
import { slackClient } from '@/utils/slackClient';

jest.mock('@/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackRemindersAdd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSlackClient.resolveUserId.mockResolvedValue('U1234567890');
    (mockSlackClient as any).reminders = {
      add: jest.fn()
    };
  });

  it('should create a reminder successfully', async () => {
    const mockReminder = {
      id: 'R1234567890',
      text: 'Test reminder',
      time: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      user: 'U1234567890'
    };

    (mockSlackClient as any).reminders.add.mockResolvedValue({
      ok: true,
      reminder: mockReminder
    });

    const result = await slackRemindersAddTool.execute({
      text: 'Test reminder',
      time: 'in 1 hour'
    });

    expect(result.success).toBe(true);
    expect(result.data.reminder_id).toBe('R1234567890');
    expect(result.data.text).toBe('Test reminder');
    expect(result.data.created).toBe(true);
    expect((mockSlackClient as any).reminders.add).toHaveBeenCalledWith({
      text: 'Test reminder',
      time: 'in 1 hour',
      user: undefined
    });
  });

  it('should create reminder for specific user', async () => {
    const mockReminder = {
      id: 'R1234567890',
      text: 'Team meeting',
      time: Math.floor(Date.now() / 1000) + 1800,
      user: 'U1234567890'
    };

    (mockSlackClient as any).reminders.add.mockResolvedValue({
      ok: true,
      reminder: mockReminder
    });

    const result = await slackRemindersAddTool.execute({
      text: 'Team meeting',
      time: 'in 30 minutes',
      user: 'john.doe'
    });

    expect(result.success).toBe(true);
    expect(mockSlackClient.resolveUserId).toHaveBeenCalledWith('john.doe');
    expect((mockSlackClient as any).reminders.add).toHaveBeenCalledWith({
      text: 'Team meeting',
      time: 'in 30 minutes',
      user: 'U1234567890'
    });
  });

  it('should include analytics when requested', async () => {
    const futureTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
    const mockReminder = {
      id: 'R1234567890',
      text: 'Long reminder text that exceeds normal length',
      time: futureTime,
      user: 'U1234567890'
    };

    (mockSlackClient as any).reminders.add.mockResolvedValue({
      ok: true,
      reminder: mockReminder
    });

    const result = await slackRemindersAddTool.execute({
      text: 'This is a very long reminder text that definitely exceeds normal length for complexity analysis',
      time: 'in 2 hours',
      include_analytics: true
    });

    expect(result.success).toBe(true);
    expect(result.data.analytics).toBeDefined();
    expect(result.data.analytics.reminder_analysis.time_until_reminder_seconds).toBeGreaterThan(7000);
    expect(result.data.analytics.reminder_analysis.complexity_score).toBe('high');
    expect(result.data.analytics.timing).toBeDefined();
  });

  it('should provide recommendations', async () => {
    const mockReminder = {
      id: 'R1234567890',
      text: 'This is a very long reminder text that definitely exceeds the recommended length for optimal readability and user experience',
      time: Math.floor(Date.now() / 1000) + 60, // 1 minute from now
      user: 'U1234567890'
    };

    (mockSlackClient as any).reminders.add.mockResolvedValue({
      ok: true,
      reminder: mockReminder
    });

    const result = await slackRemindersAddTool.execute({
      text: mockReminder.text,
      time: 'in 1 minute',
      include_recommendations: true
    });

    expect(result.success).toBe(true);
    expect(result.data.recommendations).toBeDefined();
    expect(result.data.recommendations).toContain('Consider shortening reminder text for better readability');
    expect(result.data.recommendations).toContain('Very short reminder time - consider if this provides enough notice');
  });
});
