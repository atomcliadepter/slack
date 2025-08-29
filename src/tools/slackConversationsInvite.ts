import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().describe('Channel ID or name to invite users to'),
  users: z.union([
    z.string().describe('Single user ID or username'),
    z.array(z.string()).describe('Array of user IDs or usernames')
  ]).describe('Users to invite'),
  include_analytics: z.boolean().optional().default(true).describe('Include invitation analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  send_welcome_message: z.boolean().optional().default(false).describe('Send welcome message to invited users'),
  welcome_message: z.string().optional().describe('Custom welcome message'),
  batch_size: z.number().optional().default(5).describe('Batch size for invitations')
});

export const slackConversationsInviteTool: MCPTool = {
  name: 'slack_conversations_invite',
  description: 'Invite users to a Slack channel with batch processing and analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name to invite users to'
      },
      users: {
        oneOf: [
          { type: 'string', description: 'Single user ID or username' },
          { type: 'array', items: { type: 'string' }, description: 'Array of user IDs or usernames' }
        ],
        description: 'Users to invite'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include invitation analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations', 
        default: true
      },
      send_welcome_message: {
        type: 'boolean',
        description: 'Send welcome message to invited users',
        default: false
      },
      welcome_message: {
        type: 'string',
        description: 'Custom welcome message'
      },
      batch_size: {
        type: 'number',
        description: 'Batch size for invitations',
        default: 5
      }
    },
    required: ['channel', 'users']
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        channel, 
        users, 
        include_analytics,
        include_recommendations,
        send_welcome_message,
        welcome_message,
        batch_size
      } = validatedArgs;

      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(channel);
      
      // Normalize users to array
      const userList = Array.isArray(users) ? users : [users];
      
      // Resolve user IDs
      const userIds = await Promise.all(
        userList.map(user => slackClient.resolveUserId(user))
      );

      const results = {
        successful_invites: [] as string[],
        failed_invites: [] as { user: string; error: string }[],
        already_members: [] as string[]
      };

      // Process invitations in batches
      for (let i = 0; i < userIds.length; i += (batch_size || 5)) {
        const batch = userIds.slice(i, i + (batch_size || 5));
        
        for (const userId of batch) {
          try {
            await (slackClient as any).conversations.invite({
              channel: channelId,
              users: userId
            });
            results.successful_invites.push(userId);
          } catch (error: any) {
            if (error.data?.error === 'already_in_channel') {
              results.already_members.push(userId);
            } else {
              results.failed_invites.push({
                user: userId,
                error: error.data?.error || 'Unknown error'
              });
            }
          }
        }
      }

      const result: any = {
        success: true,
        data: {
          channel_id: channelId,
          total_users: userIds.length,
          successful_invites: results.successful_invites.length,
          failed_invites: results.failed_invites.length,
          already_members: results.already_members.length,
          results
        }
      };

      // Add analytics
      if (include_analytics) {
        result.data.analytics = {
          invitation_stats: {
            success_rate: (results.successful_invites.length / userIds.length * 100).toFixed(1) + '%',
            batch_processing: {
              batch_size: batch_size || 5,
              total_batches: Math.ceil(userIds.length / (batch_size || 5))
            }
          },
          timing: {
            execution_time_ms: Date.now() - startTime,
            avg_time_per_user: Math.round((Date.now() - startTime) / userIds.length)
          }
        };
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        if (results.failed_invites.length > 0) {
          recommendations.push('Review failed invitations and check user permissions');
        }
        if (results.successful_invites.length > 0) {
          recommendations.push('Consider sending a welcome message to new members');
        }
        result.data.recommendations = recommendations;
      }

      // Send welcome message if requested
      if (send_welcome_message && results.successful_invites.length > 0) {
        const message = welcome_message || `👋 Welcome to the channel! We're excited to have you here.`;
        try {
          await (slackClient as any).chat.postMessage({
            channel: channelId,
            text: message
          });
          result.data.welcome_message_sent = true;
        } catch (error) {
          result.data.welcome_message_sent = false;
        }
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_invite', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_invite', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_invite',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
