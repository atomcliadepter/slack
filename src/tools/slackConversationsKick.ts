import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().describe('Channel ID or name to remove user from'),
  user: z.string().describe('User ID or username to remove'),
  include_analytics: z.boolean().optional().default(true).describe('Include removal analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  validate_permissions: z.boolean().optional().default(true).describe('Validate user permissions'),
  reason: z.string().optional().describe('Reason for removal (for logging)'),
  notify_user: z.boolean().optional().default(false).describe('Send DM to removed user'),
  notification_message: z.string().optional().describe('Custom notification message')
});

export const slackConversationsKickTool: MCPTool = {
  name: 'slack_conversations_kick',
  description: 'Remove a user from a Slack channel with analytics and optional notifications',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name to remove user from'
      },
      user: {
        type: 'string',
        description: 'User ID or username to remove'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include removal analytics',
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
      reason: {
        type: 'string',
        description: 'Reason for removal (for logging)'
      },
      notify_user: {
        type: 'boolean',
        description: 'Send DM to removed user',
        default: false
      },
      notification_message: {
        type: 'string',
        description: 'Custom notification message'
      }
    },
    required: ['channel', 'user']
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        channel, 
        user, 
        include_analytics,
        include_recommendations,
        validate_permissions,
        reason,
        notify_user,
        notification_message
      } = validatedArgs;

      // Resolve IDs
      const channelId = await slackClient.resolveChannelId(channel);
      const userId = await slackClient.resolveUserId(user);
      
      // Get channel and user info for analytics
      const [channelInfo, userInfo] = await Promise.all([
        (slackClient as any).conversations.info({ channel: channelId }),
        (slackClient as any).users.info({ user: userId })
      ]);

      // Validate permissions if requested
      if (validate_permissions) {
        // Check if user is actually in the channel
        try {
          const members = await (slackClient as any).conversations.members({ channel: channelId });
          if (!members.members?.includes(userId)) {
            return {
              success: false,
              error: 'User is not a member of this channel',
              data: {
                channel_id: channelId,
                user_id: userId,
                user_in_channel: false
              }
            };
          }
        } catch (error) {
          // Continue if we can't check membership
        }
      }

      // Remove user from channel
      await (slackClient as any).conversations.kick({
        channel: channelId,
        user: userId
      });

      const result: any = {
        success: true,
        data: {
          channel_id: channelId,
          channel_name: channelInfo.channel?.name,
          user_id: userId,
          user_name: userInfo.user?.name,
          removed: true,
          removal_time: new Date().toISOString(),
          reason: reason || 'No reason provided'
        }
      };

      // Add analytics
      if (include_analytics) {
        result.data.analytics = {
          channel_info: {
            channel_type: channelInfo.channel?.is_private ? 'private' : 'public',
            member_count: channelInfo.channel?.num_members || 0
          },
          user_info: {
            user_type: userInfo.user?.is_bot ? 'bot' : 'human',
            is_admin: userInfo.user?.is_admin || false
          },
          removal_timing: {
            execution_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        if (userInfo.user?.is_admin) {
          recommendations.push('⚠️ Removed user was an admin - consider reviewing channel permissions');
        }
        if (channelInfo.channel?.is_private) {
          recommendations.push('User was removed from private channel - they cannot rejoin without invitation');
        } else {
          recommendations.push('User can rejoin this public channel at any time');
        }
        result.data.recommendations = recommendations;
      }

      // Notify user if requested
      if (notify_user) {
        const message = notification_message || 
          `You have been removed from #${channelInfo.channel?.name}. ${reason ? `Reason: ${reason}` : ''}`;
        
        try {
          // Open DM conversation
          const dmResponse = await (slackClient as any).conversations.open({ users: userId });
          if (dmResponse.channel?.id) {
            await (slackClient as any).chat.postMessage({
              channel: dmResponse.channel.id,
              text: message
            });
            result.data.notification_sent = true;
          }
        } catch (error) {
          result.data.notification_sent = false;
          result.data.notification_error = 'Failed to send notification';
        }
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_kick', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_kick', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_kick',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
