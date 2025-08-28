/**
 * Enhanced Slack Set Status Tool v2.0.0
 * Comprehensive user status management with templates, scheduling, and analytics
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * Status templates enum
 */
const StatusTemplate = z.enum([
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
]);

/**
 * Input validation schema
 */
const inputSchema = z.object({
  status_text: z.string()
    .max(100, 'Status text must be 100 characters or less')
    .optional(),
  status_emoji: z.string()
    .regex(/^:[a-z0-9_+-]+:$/, 'Status emoji must be in format :emoji_name:')
    .optional(),
  status_expiration: z.number()
    .int()
    .positive()
    .optional(),
  template: StatusTemplate.optional(),
  auto_clear: z.boolean().default(false),
  auto_clear_minutes: z.number().min(1).max(1440).default(60),
  include_timezone: z.boolean().default(false),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  validate_emoji: z.boolean().default(true),
  smart_expiration: z.boolean().default(false),
  presence_status: z.enum(['auto', 'away']).optional(),
}).refine(
  (data) => data.status_text || data.status_emoji || data.template,
  'At least one of status_text, status_emoji, or template must be provided'
);

type SlackSetStatusArgs = z.infer<typeof inputSchema>;

/**
 * Status analytics interface
 */
interface StatusAnalytics {
  status_set_success: boolean;
  template_used?: string;
  emoji_validated: boolean;
  expiration_set: boolean;
  presence_updated: boolean;
  status_timing: {
    validation_ms: number;
    status_update_ms: number;
    total_operation_ms: number;
  };
  previous_status?: {
    text?: string;
    emoji?: string;
    expiration?: number;
  };
  status_insights: {
    character_count: number;
    has_emoji: boolean;
    has_expiration: boolean;
    estimated_duration_hours?: number;
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Status template definitions
 */
interface StatusTemplateDefinition {
  text: string;
  emoji: string;
  default_duration_minutes?: number;
  presence?: 'auto' | 'away';
}

const STATUS_TEMPLATES: Record<string, StatusTemplateDefinition> = {
  meeting: {
    text: 'In a meeting',
    emoji: ':calendar:',
    default_duration_minutes: 60,
    presence: 'away'
  },
  lunch: {
    text: 'Out for lunch',
    emoji: ':fork_and_knife:',
    default_duration_minutes: 60
  },
  coffee: {
    text: 'Coffee break',
    emoji: ':coffee:',
    default_duration_minutes: 15
  },
  focus: {
    text: 'In focus mode',
    emoji: ':dart:',
    default_duration_minutes: 120,
    presence: 'away'
  },
  away: {
    text: 'Away from desk',
    emoji: ':walking:',
    default_duration_minutes: 30
  },
  vacation: {
    text: 'On vacation',
    emoji: ':palm_tree:',
    default_duration_minutes: 480 // 8 hours
  },
  sick: {
    text: 'Out sick',
    emoji: ':face_with_thermometer:',
    default_duration_minutes: 480 // 8 hours
  },
  commuting: {
    text: 'Commuting',
    emoji: ':bus:',
    default_duration_minutes: 45
  },
  working_remotely: {
    text: 'Working remotely',
    emoji: ':house:',
    default_duration_minutes: 480 // 8 hours
  },
  in_office: {
    text: 'In the office',
    emoji: ':office:',
    default_duration_minutes: 480 // 8 hours
  },
  busy: {
    text: 'Busy',
    emoji: ':no_entry_sign:',
    default_duration_minutes: 120,
    presence: 'away'
  },
  available: {
    text: 'Available',
    emoji: ':white_check_mark:',
    presence: 'auto'
  },
  do_not_disturb: {
    text: 'Do not disturb',
    emoji: ':no_entry:',
    default_duration_minutes: 240,
    presence: 'away'
  }
};

/**
 * Status result interface
 */
interface StatusResult {
  success: boolean;
  status_updated: boolean;
  presence_updated: boolean;
  current_status: {
    text?: string;
    emoji?: string;
    expiration?: number;
    expiration_formatted?: string;
  };
  previous_status?: {
    text?: string;
    emoji?: string;
    expiration?: number;
  };
  analytics?: StatusAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackSetStatusTool: MCPTool = {
  name: 'slack_set_status',
  description: 'Set user status with intelligent templates, scheduling, and comprehensive analytics',
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
        description: 'Status emoji in format :emoji_name: (e.g., :coffee:, :house:)',
      },
      status_expiration: {
        type: 'number',
        description: 'Status expiration timestamp (Unix timestamp)',
      },
      template: {
        type: 'string',
        description: 'Pre-defined status template',
        enum: [
          'meeting', 'lunch', 'coffee', 'focus', 'away', 'vacation',
          'sick', 'commuting', 'working_remotely', 'in_office',
          'busy', 'available', 'do_not_disturb', 'custom'
        ],
      },
      auto_clear: {
        type: 'boolean',
        description: 'Automatically clear status after specified time',
        default: false,
      },
      auto_clear_minutes: {
        type: 'number',
        description: 'Minutes after which to auto-clear status (1-1440)',
        minimum: 1,
        maximum: 1440,
        default: 60,
      },
      include_timezone: {
        type: 'boolean',
        description: 'Include timezone information in status',
        default: false,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include analytics about the status update',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for status optimization',
        default: true,
      },
      validate_emoji: {
        type: 'boolean',
        description: 'Validate emoji format and availability',
        default: true,
      },
      smart_expiration: {
        type: 'boolean',
        description: 'Use smart expiration based on template and time of day',
        default: false,
      },
      presence_status: {
        type: 'string',
        description: 'Set presence status along with custom status',
        enum: ['auto', 'away'],
      },
    },
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackSetStatusArgs;
      const client = slackClient.getClient();
      
      let statusAnalytics: StatusAnalytics = {
        status_set_success: false,
        emoji_validated: false,
        expiration_set: false,
        presence_updated: false,
        status_timing: {
          validation_ms: 0,
          status_update_ms: 0,
          total_operation_ms: 0,
        },
        status_insights: {
          character_count: 0,
          has_emoji: false,
          has_expiration: false,
        },
        recommendations: [],
        warnings: [],
      };

      let finalStatusText = validatedArgs.status_text;
      let finalStatusEmoji = validatedArgs.status_emoji;
      let finalExpiration = validatedArgs.status_expiration;
      let finalPresence = validatedArgs.presence_status;
      let warnings: string[] = [];

      // Step 1: Get current status for comparison
      const validationStart = Date.now();
      let previousStatus: StatusAnalytics['previous_status'];
      
      try {
        const profileResult = await client.users.profile.get({});
        if (profileResult.ok && profileResult.profile) {
          previousStatus = {
            text: profileResult.profile.status_text,
            emoji: profileResult.profile.status_emoji,
            expiration: profileResult.profile.status_expiration,
          };
          statusAnalytics.previous_status = previousStatus;
        }
      } catch (error) {
        warnings.push('Could not retrieve current status for comparison');
      }

      // Step 2: Apply template if specified
      if (validatedArgs.template && validatedArgs.template !== 'custom') {
        const template = STATUS_TEMPLATES[validatedArgs.template];
        if (template) {
          finalStatusText = finalStatusText || template.text;
          finalStatusEmoji = finalStatusEmoji || template.emoji;
          finalPresence = finalPresence || template.presence;
          statusAnalytics.template_used = validatedArgs.template;

          // Apply smart expiration from template
          if (validatedArgs.smart_expiration && template.default_duration_minutes) {
            const expirationTime = Math.floor(Date.now() / 1000) + (template.default_duration_minutes * 60);
            finalExpiration = finalExpiration || expirationTime;
          }
        }
      }

      // Step 3: Apply auto-clear expiration
      if (validatedArgs.auto_clear && !finalExpiration) {
        const expirationTime = Math.floor(Date.now() / 1000) + (validatedArgs.auto_clear_minutes * 60);
        finalExpiration = expirationTime;
      }

      // Step 4: Add timezone to status text if requested
      if (validatedArgs.include_timezone && finalStatusText) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneName = timezone.split('/').pop()?.replace('_', ' ') || timezone;
        finalStatusText = `${finalStatusText} (${timezoneName})`;
      }

      // Step 5: Validate emoji format
      if (validatedArgs.validate_emoji && finalStatusEmoji) {
        if (!/^:[a-z0-9_+-]+:$/.test(finalStatusEmoji)) {
          throw new Error(`Invalid emoji format: ${finalStatusEmoji}. Use format :emoji_name:`);
        }
        statusAnalytics.emoji_validated = true;
      }

      statusAnalytics.status_timing.validation_ms = Date.now() - validationStart;

      // Step 6: Update user status
      const statusUpdateStart = Date.now();
      const statusUpdateResult = await client.users.profile.set({
        profile: {
          status_text: finalStatusText || '',
          status_emoji: finalStatusEmoji || '',
          status_expiration: finalExpiration || 0,
        },
      });

      if (!statusUpdateResult.ok) {
        throw new Error(`Failed to update status: ${statusUpdateResult.error}`);
      }

      statusAnalytics.status_set_success = true;
      statusAnalytics.expiration_set = !!finalExpiration;
      statusAnalytics.status_timing.status_update_ms = Date.now() - statusUpdateStart;

      // Step 7: Update presence if specified
      if (finalPresence) {
        try {
          const presenceResult = await client.users.setPresence({
            presence: finalPresence,
          });
          
          if (presenceResult.ok) {
            statusAnalytics.presence_updated = true;
          } else {
            warnings.push('Failed to update presence status');
          }
        } catch (error) {
          warnings.push('Error updating presence status');
        }
      }

      // Step 8: Generate analytics and insights
      statusAnalytics.status_insights = {
        character_count: finalStatusText?.length || 0,
        has_emoji: !!finalStatusEmoji,
        has_expiration: !!finalExpiration,
        estimated_duration_hours: finalExpiration ? 
          Math.round((finalExpiration - Date.now() / 1000) / 3600 * 10) / 10 : undefined,
      };

      // Step 9: Generate recommendations
      if (validatedArgs.include_recommendations) {
        statusAnalytics.recommendations = this.generateRecommendations(
          finalStatusText,
          finalStatusEmoji,
          finalExpiration,
          validatedArgs.template,
          statusAnalytics
        );
      }

      statusAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      statusAnalytics.status_timing.total_operation_ms = duration;
      
      logger.logToolExecution('slack_set_status', args, duration);

      return {
        success: true,
        data: {
          success: true,
          status_updated: true,
          presence_updated: statusAnalytics.presence_updated,
          current_status: {
            text: finalStatusText,
            emoji: finalStatusEmoji,
            expiration: finalExpiration,
            expiration_formatted: finalExpiration ? 
              new Date(finalExpiration * 1000).toLocaleString() : undefined,
          },
          previous_status: previousStatus,
          analytics: validatedArgs.include_analytics ? statusAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? 
            statusAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as StatusResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'status_update',
          template_used: statusAnalytics.template_used,
          has_expiration: statusAnalytics.expiration_set,
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

  /**
   * Generate recommendations for status optimization
   */
  generateRecommendations(
    statusText?: string,
    statusEmoji?: string,
    expiration?: number,
    template?: string,
    analytics?: StatusAnalytics
  ): string[] {
    const recommendations: string[] = [];

    // Status text recommendations
    if (statusText) {
      if (statusText.length > 50) {
        recommendations.push('Consider shortening status text for better visibility');
      }
      
      if (statusText.length < 10 && !statusEmoji) {
        recommendations.push('Consider adding an emoji to make your status more expressive');
      }
    }

    // Emoji recommendations
    if (!statusEmoji && statusText) {
      recommendations.push('Adding an emoji can make your status more visible and expressive');
    }

    // Expiration recommendations
    if (!expiration) {
      recommendations.push('Consider setting an expiration to automatically clear your status');
    } else {
      const hoursUntilExpiration = (expiration - Date.now() / 1000) / 3600;
      if (hoursUntilExpiration > 24) {
        recommendations.push('Long status durations (>24h) may need manual updates');
      } else if (hoursUntilExpiration < 0.5) {
        recommendations.push('Very short status durations (<30min) may expire too quickly');
      }
    }

    // Template-specific recommendations
    if (template) {
      switch (template) {
        case 'meeting':
          recommendations.push('Consider updating your calendar to reflect meeting status');
          break;
        case 'vacation':
          recommendations.push('Set up an auto-responder for emails during vacation');
          break;
        case 'sick':
          recommendations.push('Consider notifying your team lead about your absence');
          break;
        case 'focus':
          recommendations.push('Turn on Do Not Disturb notifications for better focus');
          break;
        case 'working_remotely':
          recommendations.push('Update your location in your profile if working from a different city');
          break;
      }
    }

    // General best practices
    if (analytics?.status_insights.character_count === 0 && !statusEmoji) {
      recommendations.push('Empty status - consider using "Available" template or clearing status');
    }

    if (recommendations.length === 0) {
      recommendations.push('Status looks good! 👍');
    }

    return recommendations;
  },

  /**
   * Get available status templates
   */
  getAvailableTemplates(): Record<string, StatusTemplateDefinition> {
    return STATUS_TEMPLATES;
  },

  /**
   * Format expiration time
   */
  formatExpirationTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMinutes = Math.round(diffHours * 60);
      return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      const hours = Math.round(diffHours);
      return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    }
  },
};

export default slackSetStatusTool;
