import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  text: z.string().describe('Reminder text'),
  time: z.string().describe('When to send reminder (e.g., "in 30 minutes", "tomorrow at 9am", "2024-12-25")'),
  user: z.string().optional().describe('User to remind (defaults to current user)'),
  include_analytics: z.boolean().optional().default(true).describe('Include reminder analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  recurring: z.boolean().optional().default(false).describe('Whether this is a recurring reminder'),
  recurrence_pattern: z.string().optional().describe('Recurrence pattern (daily, weekly, monthly)')
});

export const slackRemindersAddTool: MCPTool = {
  name: 'slack_reminders_add',
  description: 'Create a Slack reminder with smart scheduling and analytics',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Reminder text'
      },
      time: {
        type: 'string',
        description: 'When to send reminder (e.g., "in 30 minutes", "tomorrow at 9am", "2024-12-25")'
      },
      user: {
        type: 'string',
        description: 'User to remind (defaults to current user)'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include reminder analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations',
        default: true
      },
      recurring: {
        type: 'boolean',
        description: 'Whether this is a recurring reminder',
        default: false
      },
      recurrence_pattern: {
        type: 'string',
        description: 'Recurrence pattern (daily, weekly, monthly)'
      }
    },
    required: ['text', 'time']
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        text, 
        time, 
        user,
        include_analytics,
        include_recommendations,
        recurring,
        recurrence_pattern
      } = validatedArgs;

      // Resolve user ID if provided
      const userId = user ? await slackClient.resolveUserId(user) : undefined;

      // Create the reminder
      const reminderResponse = await (slackClient as any).reminders.add({
        text,
        time,
        user: userId
      });

      const result: any = {
        success: true,
        data: {
          reminder_id: reminderResponse.reminder?.id,
          text: reminderResponse.reminder?.text,
          time: reminderResponse.reminder?.time,
          user: reminderResponse.reminder?.user,
          created: true,
          creation_time: new Date().toISOString()
        }
      };

      // Add analytics
      if (include_analytics) {
        const reminderTime = reminderResponse.reminder?.time;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilReminder = reminderTime ? reminderTime - now : 0;

        result.data.analytics = {
          reminder_analysis: {
            time_until_reminder_seconds: timeUntilReminder,
            time_until_reminder_formatted: timeUntilReminder > 0 ? 
              `${Math.floor(timeUntilReminder / 3600)}h ${Math.floor((timeUntilReminder % 3600) / 60)}m` : 
              'Past due',
            reminder_type: recurring ? 'recurring' : 'one-time',
            text_length: text.length,
            complexity_score: text.split(' ').length > 10 ? 'high' : 'low'
          },
          timing: {
            execution_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };

        // Add recurrence analysis if applicable
        if (recurring && recurrence_pattern) {
          result.data.analytics.recurrence_analysis = {
            pattern: recurrence_pattern,
            estimated_occurrences_per_month: 
              recurrence_pattern === 'daily' ? 30 :
              recurrence_pattern === 'weekly' ? 4 :
              recurrence_pattern === 'monthly' ? 1 : 'unknown'
          };
        }
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        
        if (text.length > 100) {
          recommendations.push('Consider shortening reminder text for better readability');
        }
        
        if (recurring && !recurrence_pattern) {
          recommendations.push('Specify recurrence pattern for better reminder management');
        }
        
        const timeUntilReminder = reminderResponse.reminder?.time ? 
          reminderResponse.reminder.time - Math.floor(Date.now() / 1000) : 0;
        
        if (timeUntilReminder < 300) { // Less than 5 minutes
          recommendations.push('Very short reminder time - consider if this provides enough notice');
        }
        
        if (timeUntilReminder > 86400 * 30) { // More than 30 days
          recommendations.push('Long-term reminder - consider breaking into smaller milestones');
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_reminders_add', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reminders_add', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reminders_add',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
