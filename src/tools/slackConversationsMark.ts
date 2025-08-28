/**
 * Enhanced Slack Conversations Mark Tool v2.0.0
 * Comprehensive conversation marking with read status management and analytics
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * Input validation schema
 */
const inputSchema = z.object({
  channel: z.string()
    .min(1, 'Channel ID or name is required')
    .refine(val => val.startsWith('C') || val.startsWith('#'), 'Channel must be a valid ID (C1234567890) or name (#general)'),
  ts: z.string()
    .min(1, 'Message timestamp is required')
    .regex(/^\d+\.\d+$/, 'Timestamp must be in format "1234567890.123456"'),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  track_read_activity: z.boolean().default(false),
  validate_message: z.boolean().default(true),
  update_last_read: z.boolean().default(true),
});

type SlackConversationsMarkArgs = z.infer<typeof inputSchema>;

/**
 * Read activity analytics interface
 */
interface ReadActivityAnalytics {
  mark_timestamp: string;
  message_timestamp: string;
  channel_info: {
    channel_id: string;
    channel_name?: string;
    channel_type: 'public_channel' | 'private_channel' | 'im' | 'mpim';
  };
  read_status: {
    messages_marked_read: number;
    time_since_message: number; // Minutes since the marked message
    read_velocity: 'immediate' | 'fast' | 'normal' | 'slow' | 'very_slow';
    catch_up_status: 'caught_up' | 'behind' | 'very_behind';
  };
  message_context: {
    message_exists: boolean;
    message_type?: string;
    message_user?: string;
    is_thread_parent?: boolean;
    has_replies?: boolean;
    reply_count?: number;
  };
  engagement_insights: {
    reading_pattern: 'active' | 'passive' | 'selective';
    estimated_unread_count: number;
    channel_activity_level: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Mark result interface
 */
interface MarkResult {
  success: boolean;
  channel_id: string;
  channel_name?: string;
  marked_timestamp: string;
  mark_time: string;
  message_validated: boolean;
  analytics?: ReadActivityAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackConversationsMarkTool: MCPTool = {
  name: 'slack_conversations_mark',
  description: 'Mark conversation as read with comprehensive analytics, read status management, and engagement insights',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or name (#general) to mark as read',
      },
      ts: {
        type: 'string',
        description: 'Timestamp of message to mark as read (format: "1234567890.123456")',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive read activity analytics',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for read management optimization',
        default: true,
      },
      track_read_activity: {
        type: 'boolean',
        description: 'Track detailed read activity patterns',
        default: false,
      },
      validate_message: {
        type: 'boolean',
        description: 'Validate that the message exists before marking',
        default: true,
      },
      update_last_read: {
        type: 'boolean',
        description: 'Update the last read timestamp for the channel',
        default: true,
      },
    },
    required: ['channel', 'ts'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackConversationsMarkArgs;
      const client = slackClient.getClient();
      
      let readActivityAnalytics: ReadActivityAnalytics = {
        mark_timestamp: new Date().toISOString(),
        message_timestamp: validatedArgs.ts,
        channel_info: {
          channel_id: '',
          channel_type: 'public_channel',
        },
        read_status: {
          messages_marked_read: 0,
          time_since_message: 0,
          read_velocity: 'normal',
          catch_up_status: 'caught_up',
        },
        message_context: {
          message_exists: false,
        },
        engagement_insights: {
          reading_pattern: 'active',
          estimated_unread_count: 0,
          channel_activity_level: 'medium',
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];
      let channelId = validatedArgs.channel;
      let channelName: string | undefined;
      let channelType: 'public_channel' | 'private_channel' | 'im' | 'mpim' = 'public_channel';

      // Step 1: Resolve channel ID if name provided
      if (validatedArgs.channel.startsWith('#')) {
        try {
          const channelNameToResolve = validatedArgs.channel.slice(1);
          const channelsResult = await client.conversations.list({
            types: 'public_channel,private_channel,im,mpim',
            limit: 1000,
          });
          
          if (channelsResult.ok && channelsResult.channels) {
            const channel = channelsResult.channels.find((ch: any) => ch.name === channelNameToResolve);
            if (channel && channel.id) {
              channelId = channel.id;
              channelName = channel.name || undefined;
              channelType = this.determineChannelType(channel);
            } else {
              throw new Error(`Channel #${channelNameToResolve} not found`);
            }
          }
        } catch (error) {
          throw new Error(`Failed to resolve channel name: ${validatedArgs.channel}`);
        }
      } else {
        // Get channel info for ID
        try {
          const channelInfo = await client.conversations.info({
            channel: channelId,
          });
          
          if (channelInfo.ok && channelInfo.channel) {
            channelName = channelInfo.channel.name;
            channelType = this.determineChannelType(channelInfo.channel);
          }
        } catch (error) {
          warnings.push('Could not retrieve channel information');
        }
      }

      // Step 2: Validate message exists if requested
      let messageExists = false;
      let messageContext: any = {};
      
      if (validatedArgs.validate_message) {
        try {
          const historyResult = await client.conversations.history({
            channel: channelId,
            latest: validatedArgs.ts,
            oldest: validatedArgs.ts,
            inclusive: true,
            limit: 1,
          });
          
          if (historyResult.ok && historyResult.messages && historyResult.messages.length > 0) {
            messageExists = true;
            const message = historyResult.messages[0];
            messageContext = {
              message_type: message.type,
              message_user: message.user,
              is_thread_parent: !!message.thread_ts && message.thread_ts === message.ts,
              has_replies: !!message.reply_count && message.reply_count > 0,
              reply_count: message.reply_count || 0,
            };
          } else {
            warnings.push(`Message with timestamp ${validatedArgs.ts} not found in channel`);
          }
        } catch (error) {
          warnings.push('Could not validate message existence');
        }
      }

      // Step 3: Mark the conversation
      const markResult = await client.conversations.mark({
        channel: channelId,
        ts: validatedArgs.ts,
      });

      if (!markResult.ok) {
        throw new Error(`Failed to mark conversation: ${markResult.error}`);
      }

      // Step 4: Generate analytics
      if (validatedArgs.include_analytics) {
        readActivityAnalytics = this.generateReadActivityAnalytics(
          channelId,
          channelName,
          channelType,
          validatedArgs.ts,
          messageExists,
          messageContext,
          validatedArgs
        );
      }

      // Step 5: Generate recommendations
      if (validatedArgs.include_recommendations) {
        readActivityAnalytics.recommendations = this.generateRecommendations(
          readActivityAnalytics,
          messageExists,
          validatedArgs
        );
      }

      readActivityAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_mark', args, duration);

      return {
        success: true,
        data: {
          success: true,
          channel_id: channelId,
          channel_name: channelName,
          marked_timestamp: validatedArgs.ts,
          mark_time: new Date().toISOString(),
          message_validated: messageExists,
          analytics: validatedArgs.include_analytics ? readActivityAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? readActivityAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as MarkResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'conversation_mark',
          channel_id: channelId,
          marked_timestamp: validatedArgs.ts,
          message_validated: messageExists,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_mark', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_mark',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Determine channel type from channel object
   */
  determineChannelType(channel: any): 'public_channel' | 'private_channel' | 'im' | 'mpim' {
    if (channel.is_im) return 'im';
    if (channel.is_mpim) return 'mpim';
    if (channel.is_private) return 'private_channel';
    return 'public_channel';
  },

  /**
   * Generate comprehensive read activity analytics
   */
  generateReadActivityAnalytics(
    channelId: string,
    channelName: string | undefined,
    channelType: 'public_channel' | 'private_channel' | 'im' | 'mpim',
    messageTimestamp: string,
    messageExists: boolean,
    messageContext: any,
    args: SlackConversationsMarkArgs
  ): ReadActivityAnalytics {
    const now = Date.now() / 1000; // Current time in seconds
    const messageTime = parseFloat(messageTimestamp);
    const timeSinceMessage = (now - messageTime) / 60; // Minutes since message

    const analytics: ReadActivityAnalytics = {
      mark_timestamp: new Date().toISOString(),
      message_timestamp: messageTimestamp,
      channel_info: {
        channel_id: channelId,
        channel_name: channelName,
        channel_type: channelType,
      },
      read_status: {
        messages_marked_read: 1,
        time_since_message: timeSinceMessage,
        read_velocity: this.calculateReadVelocity(timeSinceMessage),
        catch_up_status: this.calculateCatchUpStatus(timeSinceMessage),
      },
      message_context: {
        message_exists: messageExists,
        message_type: messageContext.message_type,
        message_user: messageContext.message_user,
        is_thread_parent: messageContext.is_thread_parent,
        has_replies: messageContext.has_replies,
        reply_count: messageContext.reply_count,
      },
      engagement_insights: {
        reading_pattern: this.determineReadingPattern(timeSinceMessage, channelType),
        estimated_unread_count: this.estimateUnreadCount(timeSinceMessage, channelType),
        channel_activity_level: this.estimateChannelActivity(channelType),
      },
      recommendations: [],
      warnings: [],
    };

    return analytics;
  },

  /**
   * Calculate read velocity based on time since message
   */
  calculateReadVelocity(timeSinceMessage: number): ReadActivityAnalytics['read_status']['read_velocity'] {
    if (timeSinceMessage < 5) return 'immediate';
    if (timeSinceMessage < 30) return 'fast';
    if (timeSinceMessage < 120) return 'normal';
    if (timeSinceMessage < 480) return 'slow';
    return 'very_slow';
  },

  /**
   * Calculate catch-up status based on time since message
   */
  calculateCatchUpStatus(timeSinceMessage: number): ReadActivityAnalytics['read_status']['catch_up_status'] {
    if (timeSinceMessage < 60) return 'caught_up';
    if (timeSinceMessage < 480) return 'behind';
    return 'very_behind';
  },

  /**
   * Determine reading pattern based on timing and channel type
   */
  determineReadingPattern(
    timeSinceMessage: number, 
    channelType: string
  ): ReadActivityAnalytics['engagement_insights']['reading_pattern'] {
    if (channelType === 'im' || channelType === 'mpim') {
      return timeSinceMessage < 30 ? 'active' : 'passive';
    }
    
    if (timeSinceMessage < 15) return 'active';
    if (timeSinceMessage < 120) return 'selective';
    return 'passive';
  },

  /**
   * Estimate unread count based on time and channel type
   */
  estimateUnreadCount(timeSinceMessage: number, channelType: string): number {
    const baseRate = channelType === 'im' ? 0.5 : channelType === 'mpim' ? 1 : 2; // Messages per minute
    return Math.round(timeSinceMessage * baseRate);
  },

  /**
   * Estimate channel activity level based on channel type
   */
  estimateChannelActivity(channelType: string): ReadActivityAnalytics['engagement_insights']['channel_activity_level'] {
    switch (channelType) {
      case 'im': return 'medium';
      case 'mpim': return 'high';
      case 'private_channel': return 'medium';
      case 'public_channel': return 'high';
      default: return 'medium';
    }
  },

  /**
   * Generate recommendations for read management optimization
   */
  generateRecommendations(
    analytics: ReadActivityAnalytics,
    messageExists: boolean,
    args: SlackConversationsMarkArgs
  ): string[] {
    const recommendations: string[] = [];

    // Message validation recommendations
    if (!messageExists) {
      recommendations.push('Message not found - consider verifying the timestamp or checking if the message was deleted');
    }

    // Read velocity recommendations
    switch (analytics.read_status.read_velocity) {
      case 'very_slow':
        recommendations.push('Very slow read response - consider enabling notifications or checking the channel more frequently');
        break;
      case 'slow':
        recommendations.push('Slow read response - you might want to prioritize this channel for more timely updates');
        break;
      case 'immediate':
        recommendations.push('Excellent read responsiveness! You\'re staying on top of this conversation');
        break;
    }

    // Catch-up status recommendations
    switch (analytics.read_status.catch_up_status) {
      case 'very_behind':
        recommendations.push('You\'re very behind on this conversation - consider reviewing recent messages or asking for a summary');
        break;
      case 'behind':
        recommendations.push('You\'re behind on this conversation - consider catching up on recent messages');
        break;
      case 'caught_up':
        recommendations.push('You\'re caught up on this conversation - great job staying current!');
        break;
    }

    // Reading pattern recommendations
    switch (analytics.engagement_insights.reading_pattern) {
      case 'passive':
        recommendations.push('Passive reading pattern detected - consider more active engagement if this channel is important');
        break;
      case 'selective':
        recommendations.push('Selective reading pattern - good balance of engagement and efficiency');
        break;
      case 'active':
        recommendations.push('Active reading pattern - excellent engagement with this channel');
        break;
    }

    // Channel type specific recommendations
    switch (analytics.channel_info.channel_type) {
      case 'im':
        recommendations.push('Direct message - consider responding promptly to maintain good communication');
        break;
      case 'mpim':
        recommendations.push('Group message - ensure you\'re contributing to the group discussion when appropriate');
        break;
      case 'private_channel':
        recommendations.push('Private channel - stay engaged as these often contain important team discussions');
        break;
      case 'public_channel':
        recommendations.push('Public channel - consider the broader audience when engaging');
        break;
    }

    // Thread recommendations
    if (analytics.message_context.is_thread_parent && analytics.message_context.has_replies) {
      recommendations.push('This message has thread replies - consider reviewing the thread for complete context');
    }

    // Estimated unread recommendations
    if (analytics.engagement_insights.estimated_unread_count > 10) {
      recommendations.push(`Estimated ${analytics.engagement_insights.estimated_unread_count} unread messages - consider reviewing recent activity`);
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Read status updated successfully - you\'re managing your conversations well!');
    }

    return recommendations;
  },
};

export default slackConversationsMarkTool;
