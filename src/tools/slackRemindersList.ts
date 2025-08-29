import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  include_analytics: z.boolean().optional().default(true).describe('Include reminder analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  sort_by: z.enum(['time', 'created', 'text']).optional().default('time').describe('Sort reminders by field'),
  filter_upcoming: z.boolean().optional().default(false).describe('Only show upcoming reminders'),
  detailed_analysis: z.boolean().optional().default(false).describe('Include detailed reminder analysis')
});

export const slackRemindersListTool: MCPTool = {
  name: 'slack_reminders_list',
  description: 'List Slack reminders with analytics and management insights',
  inputSchema: {
    type: 'object',
    properties: {
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
      sort_by: {
        type: 'string',
        enum: ['time', 'created', 'text'],
        description: 'Sort reminders by field',
        default: 'time'
      },
      filter_upcoming: {
        type: 'boolean',
        description: 'Only show upcoming reminders',
        default: false
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Include detailed reminder analysis',
        default: false
      }
    }
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        include_analytics,
        include_recommendations,
        sort_by,
        filter_upcoming,
        detailed_analysis
      } = validatedArgs;

      // Get reminders list
      const remindersResponse = await (slackClient as any).reminders.list();
      let reminders = remindersResponse.reminders || [];

      // Filter upcoming if requested
      if (filter_upcoming) {
        const now = Math.floor(Date.now() / 1000);
        reminders = reminders.filter((reminder: any) => reminder.time && reminder.time > now);
      }

      // Sort reminders
      reminders.sort((a: any, b: any) => {
        switch (sort_by) {
          case 'time':
            return (a.time || 0) - (b.time || 0);
          case 'created':
            return (a.creation_ts || 0) - (b.creation_ts || 0);
          case 'text':
            return (a.text || '').localeCompare(b.text || '');
          default:
            return 0;
        }
      });

      // Enhance reminders with metadata
      const enhancedReminders = reminders.map((reminder: any) => {
        const now = Math.floor(Date.now() / 1000);
        const timeUntil = reminder.time ? reminder.time - now : 0;
        
        return {
          ...reminder,
          metadata: {
            time_until_seconds: timeUntil,
            time_until_formatted: timeUntil > 0 ? 
              `${Math.floor(timeUntil / 3600)}h ${Math.floor((timeUntil % 3600) / 60)}m` : 
              'Overdue',
            status: timeUntil > 0 ? 'upcoming' : 'overdue',
            text_length: reminder.text?.length || 0,
            urgency: timeUntil < 3600 ? 'high' : timeUntil < 86400 ? 'medium' : 'low'
          }
        };
      });

        const result: any = {
        success: true,
        data: {
          reminders: enhancedReminders,
          total_count: enhancedReminders.length,
          upcoming_count: enhancedReminders.filter((r: any) => r.metadata.status === 'upcoming').length,
          overdue_count: enhancedReminders.filter((r: any) => r.metadata.status === 'overdue').length
        }
      };

      // Add analytics
      if (include_analytics) {
        const now = Math.floor(Date.now() / 1000);
        const upcomingReminders = enhancedReminders.filter((r: any) => r.metadata.status === 'upcoming');
        const overdueReminders = enhancedReminders.filter((r: any) => r.metadata.status === 'overdue');

        result.data.analytics = {
          reminder_distribution: {
            total: enhancedReminders.length,
            upcoming: upcomingReminders.length,
            overdue: overdueReminders.length,
            completion_rate: enhancedReminders.length > 0 ? 
              ((enhancedReminders.length - overdueReminders.length) / enhancedReminders.length * 100).toFixed(1) + '%' : 
              '100%'
          },
          urgency_breakdown: {
            high: enhancedReminders.filter((r: any) => r.metadata.urgency === 'high').length,
            medium: enhancedReminders.filter((r: any) => r.metadata.urgency === 'medium').length,
            low: enhancedReminders.filter((r: any) => r.metadata.urgency === 'low').length
          },
          timing_insights: {
            next_reminder: upcomingReminders.length > 0 ? 
              upcomingReminders[0].metadata.time_until_formatted : 'None',
            average_text_length: enhancedReminders.length > 0 ?
              Math.round(enhancedReminders.reduce((sum: number, r: any) => sum + r.metadata.text_length, 0) / enhancedReminders.length) : 0
          }
        };

        // Detailed analysis if requested
        if (detailed_analysis) {
          result.data.analytics.detailed_analysis = {
            reminder_patterns: {
              most_common_hour: 'Analysis not available',
              average_lead_time: 'Analysis not available',
              text_complexity: enhancedReminders.filter((r: any) => r.metadata.text_length > 50).length > 0 ? 'high' : 'low'
            },
            productivity_insights: {
              reminders_per_day: (enhancedReminders.length / 30).toFixed(1),
              overdue_percentage: enhancedReminders.length > 0 ? 
                (overdueReminders.length / enhancedReminders.length * 100).toFixed(1) + '%' : '0%'
            }
          };
        }
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        const overdueCount = enhancedReminders.filter((r: any) => r.metadata.status === 'overdue').length;
        const highUrgencyCount = enhancedReminders.filter((r: any) => r.metadata.urgency === 'high').length;

        if (overdueCount > 0) {
          recommendations.push(`You have ${overdueCount} overdue reminder(s) - consider completing or rescheduling them`);
        }

        if (highUrgencyCount > 3) {
          recommendations.push('Multiple high-urgency reminders - consider prioritizing your tasks');
        }

        if (enhancedReminders.length === 0) {
          recommendations.push('No reminders set - consider adding reminders for important tasks');
        }

        if (enhancedReminders.length > 20) {
          recommendations.push('Many active reminders - consider completing some to reduce cognitive load');
        }

        const avgTextLength = enhancedReminders.length > 0 ?
          enhancedReminders.reduce((sum: number, r: any) => sum + r.metadata.text_length, 0) / enhancedReminders.length : 0;
        
        if (avgTextLength > 100) {
          recommendations.push('Consider using shorter, more actionable reminder text');
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_reminders_list', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reminders_list', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reminders_list',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
