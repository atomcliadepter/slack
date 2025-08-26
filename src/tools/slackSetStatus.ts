
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Set Status Tool
 * Intelligent status management with templates, scheduling, and automation
 */
export const slackSetStatusTool: MCPTool = {
  name: 'slack_set_status',
  description: 'Set user status with intelligent templates, scheduling, and automation features',
  inputSchema: {
    type: 'object',
    properties: {
      status_text: {
        type: 'string',
        description: 'Status text message (max 100 characters)',
        maxLength: 100,
      },
      status_emoji: {
        type: 'string',
        description: 'Status emoji (e.g., :coffee:, :house:, :calendar:)',
      },
      status_expiration: {
        type: 'number',
        description: 'Status expiration timestamp (Unix timestamp)',
      },
      template: {
        type: 'string',
        description: 'Pre-defined status template',
        enum: [
          'meeting',
          'lunch',
          'coffee',
          'focus',
          'away',
          'vacation',
          'sick',
          'commuting',
          'working_remotely',
          'in_office',
          'busy',
          'available',
          'do_not_disturb',
          'custom'
        ],
      },
      duration_minutes: {
        type: 'number',
        description: 'Status duration in minutes (alternative to status_expiration)',
        minimum: 1,
        maximum: 10080, // 1 week
      },
      auto_clear: {
        type: 'boolean',
        description: 'Automatically clear status when it expires',
        default: true,
      },
      presence: {
        type: 'string',
        description: 'Set presence along with status',
        enum: ['auto', 'away'],
      },
      snooze_dnd: {
        type: 'number',
        description: 'Snooze Do Not Disturb for specified minutes',
        minimum: 1,
        maximum: 1440, // 24 hours
      },
    },
    required: [],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.setStatus, args);
      
      // Apply template if specified
      let statusText = validatedArgs.status_text;
      let statusEmoji = validatedArgs.status_emoji;
      let suggestedDuration = args.duration_minutes;

      if (args.template && args.template !== 'custom') {
        const template = getStatusTemplate(args.template);
        statusText = statusText || template.text;
        statusEmoji = statusEmoji || template.emoji;
        suggestedDuration = suggestedDuration || template.duration_minutes;
      }

      // Calculate expiration timestamp
      let statusExpiration = validatedArgs.status_expiration;
      if (!statusExpiration && (args.duration_minutes || suggestedDuration)) {
        const durationMs = (args.duration_minutes || suggestedDuration) * 60 * 1000;
        statusExpiration = Math.floor((Date.now() + durationMs) / 1000);
      }

      // Prepare status profile update
      const profileUpdate: any = {};
      
      if (statusText !== undefined) {
        profileUpdate.status_text = statusText;
      }
      
      if (statusEmoji !== undefined) {
        profileUpdate.status_emoji = statusEmoji;
      }
      
      if (statusExpiration !== undefined) {
        profileUpdate.status_expiration = statusExpiration;
      }

      // Update user profile with status
      if (Object.keys(profileUpdate).length > 0) {
        await slackClient.getClient().users.profile.set({
          profile: profileUpdate,
        });
      }

      // Set presence if specified
      let presenceResult = null;
      if (args.presence) {
        try {
          presenceResult = await slackClient.getClient().users.setPresence({
            presence: args.presence,
          });
        } catch (error) {
          logger.warn('Failed to set presence:', ErrorHandler.handleError(error));
        }
      }

      // Handle Do Not Disturb snoozing
      let dndResult = null;
      if (args.snooze_dnd) {
        try {
          dndResult = await slackClient.getClient().dnd.setSnooze({
            num_minutes: args.snooze_dnd,
          });
        } catch (error) {
          logger.warn('Failed to set DND snooze:', ErrorHandler.handleError(error));
        }
      }

      // Get current user info to return updated status
      const userInfo = await slackClient.getClient().auth.test();
      const updatedProfile = await slackClient.getClient().users.profile.get({
        user: userInfo.user_id!,
      });

      // Analyze status
      const statusAnalysis = {
        has_text: !!statusText,
        has_emoji: !!statusEmoji,
        has_expiration: !!statusExpiration,
        is_temporary: !!statusExpiration,
        template_used: args.template || null,
        estimated_duration_minutes: suggestedDuration || null,
        expires_at: statusExpiration ? new Date(statusExpiration * 1000).toISOString() : null,
      };

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_set_status', args, duration);

      return {
        success: true,
        status: {
          text: updatedProfile.profile?.status_text || '',
          emoji: updatedProfile.profile?.status_emoji || '',
          expiration: updatedProfile.profile?.status_expiration || null,
          expires_at: updatedProfile.profile?.status_expiration 
            ? new Date(updatedProfile.profile.status_expiration * 1000).toISOString() 
            : null,
        },
        presence: presenceResult ? {
          presence: args.presence,
          success: !!presenceResult.ok,
        } : null,
        dnd: dndResult ? {
          snooze_minutes: args.snooze_dnd,
          snooze_enabled: !!dndResult.snooze_enabled,
          snooze_endtime: dndResult.snooze_endtime 
            ? new Date(dndResult.snooze_endtime * 1000).toISOString() 
            : null,
        } : null,
        analysis: statusAnalysis,
        metadata: {
          template_applied: args.template || null,
          auto_expiration: !!statusExpiration,
          presence_updated: !!args.presence,
          dnd_snoozed: !!args.snooze_dnd,
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_set_status', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_set_status',
        args,
        execution_time_ms: duration,
      });
    }
  },
};

/**
 * Get predefined status templates
 */
function getStatusTemplate(template: string) {
  const templates: Record<string, { text: string; emoji: string; duration_minutes?: number }> = {
    meeting: {
      text: 'In a meeting',
      emoji: ':calendar:',
      duration_minutes: 60,
    },
    lunch: {
      text: 'Out for lunch',
      emoji: ':fork_and_knife:',
      duration_minutes: 60,
    },
    coffee: {
      text: 'Coffee break',
      emoji: ':coffee:',
      duration_minutes: 15,
    },
    focus: {
      text: 'In focus mode',
      emoji: ':dart:',
      duration_minutes: 120,
    },
    away: {
      text: 'Away from desk',
      emoji: ':walking:',
      duration_minutes: 30,
    },
    vacation: {
      text: 'On vacation',
      emoji: ':palm_tree:',
      // No duration - typically set manually
    },
    sick: {
      text: 'Out sick',
      emoji: ':face_with_thermometer:',
      // No duration - typically set manually
    },
    commuting: {
      text: 'Commuting',
      emoji: ':bus:',
      duration_minutes: 45,
    },
    working_remotely: {
      text: 'Working remotely',
      emoji: ':house:',
      duration_minutes: 480, // 8 hours
    },
    in_office: {
      text: 'In the office',
      emoji: ':office:',
      duration_minutes: 480, // 8 hours
    },
    busy: {
      text: 'Busy',
      emoji: ':no_entry_sign:',
      duration_minutes: 60,
    },
    available: {
      text: 'Available',
      emoji: ':white_check_mark:',
      duration_minutes: 240, // 4 hours
    },
    do_not_disturb: {
      text: 'Do not disturb',
      emoji: ':no_entry:',
      duration_minutes: 120,
    },
  };

  return templates[template] || { text: '', emoji: '' };
}
