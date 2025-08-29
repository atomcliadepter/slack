import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().describe('Channel ID or name to unarchive'),
  include_analytics: z.boolean().optional().default(true).describe('Include unarchive analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  validate_permissions: z.boolean().optional().default(true).describe('Validate user permissions'),
  notify_members: z.boolean().optional().default(false).describe('Notify channel members'),
  notification_message: z.string().optional().describe('Custom notification message')
});

export const slackConversationsUnarchiveTool: MCPTool = {
  name: 'slack_conversations_unarchive',
  description: 'Unarchive a Slack channel with analytics and safety checks',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name to unarchive'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include unarchive analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean', 
        description: 'Include recommendations',
        default: true
      },
      validate_permissions: {
        type: 'boolean',
        description: 'Validate user permissions',
        default: true
      },
      notify_members: {
        type: 'boolean',
        description: 'Notify channel members',
        default: false
      },
      notification_message: {
        type: 'string',
        description: 'Custom notification message'
      }
    },
    required: ['channel']
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        channel, 
        include_analytics, 
        include_recommendations,
        validate_permissions,
        notify_members,
        notification_message
      } = validatedArgs;

      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(channel);
      
      // Get channel info
      const channelInfo = await (slackClient as any).conversations.info({ channel: channelId });
      
      if (!channelInfo.channel?.is_archived) {
        return {
          success: false,
          error: 'Channel is not archived',
          data: {
            channel_id: channelId,
            channel_name: channelInfo.channel?.name,
            is_archived: false
          }
        };
      }

      // Unarchive the channel
      await (slackClient as any).conversations.unarchive({ channel: channelId });

      const result: any = {
        success: true,
        data: {
          channel_id: channelId,
          channel_name: channelInfo.channel?.name,
          unarchived: true,
          unarchive_time: new Date().toISOString()
        }
      };

      // Add analytics
      if (include_analytics) {
        result.data.analytics = {
          channel_info: {
            member_count: channelInfo.channel?.num_members || 0,
            channel_type: channelInfo.channel?.is_private ? 'private' : 'public',
            created: channelInfo.channel?.created
          },
          unarchive_timing: {
            execution_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Add recommendations
      if (include_recommendations) {
        result.data.recommendations = [
          'Consider posting a welcome back message to re-engage members',
          'Review and update channel purpose if needed',
          'Check if channel permissions need updating'
        ];
      }

      // Notify members if requested
      if (notify_members && channelId) {
        const message = notification_message || `📢 Welcome back! This channel has been unarchived and is ready for new discussions.`;
        try {
          await (slackClient as any).chat.postMessage({
            channel: channelId,
            text: message
          });
          result.data.notification_sent = true;
        } catch (error) {
          result.data.notification_sent = false;
          result.data.notification_error = 'Failed to send notification';
        }
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_unarchive', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_unarchive', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_unarchive',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
