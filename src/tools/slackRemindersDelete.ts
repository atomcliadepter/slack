import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  reminder_id: z.string().describe('Reminder ID to delete'),
  include_analytics: z.boolean().optional().default(true).describe('Include deletion analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  confirm_deletion: z.boolean().optional().default(false).describe('Confirm deletion (safety check)')
});

export const slackRemindersDeleteTool: MCPTool = {
  name: 'slack_reminders_delete',
  description: 'Delete a Slack reminder with analytics and safety checks',
  inputSchema: {
    type: 'object',
    properties: {
      reminder_id: {
        type: 'string',
        description: 'Reminder ID to delete'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include deletion analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations',
        default: true
      },
      confirm_deletion: {
        type: 'boolean',
        description: 'Confirm deletion (safety check)',
        default: false
      }
    },
    required: ['reminder_id']
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        reminder_id,
        include_analytics,
        include_recommendations,
        confirm_deletion
      } = validatedArgs;

      // Safety check
      if (!confirm_deletion) {
        return {
          success: false,
          error: 'Deletion not confirmed. Set confirm_deletion: true to proceed.',
          data: {
            reminder_id,
            deletion_prevented: true,
            safety_check: 'Confirmation required'
          }
        };
      }

      // Get reminder info before deletion
      let reminderInfo = null;
      try {
        const remindersResponse = await (slackClient as any).reminders.list();
        reminderInfo = remindersResponse.reminders?.find((r: any) => r.id === reminder_id);
      } catch (error) {
        // Continue if we can't get reminder info
      }

      // Delete the reminder
      await (slackClient as any).reminders.delete({ reminder: reminder_id });

      const result: any = {
        success: true,
        data: {
          reminder_id,
          deleted: true,
          deletion_time: new Date().toISOString(),
          reminder_info: reminderInfo ? {
            text: reminderInfo.text,
            time: reminderInfo.time,
            user: reminderInfo.user
          } : null
        }
      };

      // Add analytics
      if (include_analytics) {
        result.data.analytics = {
          deletion_metadata: {
            had_reminder_info: !!reminderInfo,
            reminder_was_upcoming: reminderInfo?.time ? reminderInfo.time > Math.floor(Date.now() / 1000) : null,
            text_length: reminderInfo?.text?.length || 0
          },
          timing: {
            execution_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        if (reminderInfo?.time && reminderInfo.time > Math.floor(Date.now() / 1000)) {
          recommendations.push('Deleted an upcoming reminder - consider rescheduling if still needed');
        }
        if (!reminderInfo) {
          recommendations.push('Reminder info unavailable - verify deletion was successful');
        }
        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_reminders_delete', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reminders_delete', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reminders_delete',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
