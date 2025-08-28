import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Enhanced input validation schema
const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  limit: z.number().min(1).max(1000).optional().default(100),
  oldest: z.string().optional(),
  latest: z.string().optional(),
  inclusive: z.boolean().optional().default(false),
  include_all_metadata: z.boolean().optional().default(false),
  cursor: z.string().optional(),
  filter_by_user: z.string().optional(),
  filter_by_type: z.array(z.string()).optional(),
  include_analytics: z.boolean().optional().default(true),
});

type SlackGetChannelHistoryArgs = z.infer<typeof inputSchema>;

export const slackGetChannelHistoryTool: MCPTool = {
  name: 'slack_get_channel_history',
  description: 'Retrieve channel message history with advanced filtering, pagination, and analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name (with # prefix) to get history from',
      },
      limit: {
        type: 'number',
        description: 'Number of messages to retrieve (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      oldest: {
        type: 'string',
        description: 'Start of time range (timestamp)',
      },
      latest: {
        type: 'string',
        description: 'End of time range (timestamp)',
      },
      inclusive: {
        type: 'boolean',
        description: 'Include messages with oldest and latest timestamps',
        default: false,
      },
      include_all_metadata: {
        type: 'boolean',
        description: 'Include all message metadata and reactions',
        default: false,
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving next page',
      },
      filter_by_user: {
        type: 'string',
        description: 'Filter messages by specific user ID',
      },
      filter_by_type: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by message types (message, file_share, etc.)',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include message analytics and insights',
        default: true,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackGetChannelHistoryArgs;
      
      // Resolve channel ID if channel name provided
      let channelId = validatedArgs.channel;
      if (validatedArgs.channel.startsWith('#')) {
        channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      }

      // Prepare API parameters
      const apiParams: any = {
        channel: channelId,
        limit: validatedArgs.limit,
        oldest: validatedArgs.oldest,
        latest: validatedArgs.latest,
        inclusive: validatedArgs.inclusive,
        cursor: validatedArgs.cursor,
      };

      // Remove undefined values
      Object.keys(apiParams).forEach(key => {
        if (apiParams[key] === undefined) {
          delete apiParams[key];
        }
      });

      // Retrieve message history
      const result = await slackClient.getClient().conversations.history(apiParams);

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      let messages = result.messages || [];

      // Apply client-side filters
      if (validatedArgs.filter_by_user) {
        messages = messages.filter((msg: any) => msg.user === validatedArgs.filter_by_user);
      }

      if (validatedArgs.filter_by_type && validatedArgs.filter_by_type.length > 0) {
        messages = messages.filter((msg: any) => 
          validatedArgs.filter_by_type!.includes(msg.type || 'message')
        );
      }

      // Enhance messages with additional metadata if requested
      if (validatedArgs.include_all_metadata) {
        messages = await this.enhanceMessagesWithMetadata(messages);
      }

      // Generate analytics if requested
      let analytics = {};
      if (validatedArgs.include_analytics) {
        analytics = this.generateMessageAnalytics(messages, validatedArgs);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_get_channel_history', args, duration);

      return {
        success: true,
        data: {
          messages,
          has_more: result.has_more,
          pin_count: result.pin_count,
          response_metadata: result.response_metadata,
          channel_id: channelId,
        },
        metadata: {
          execution_time_ms: duration,
          message_count: messages.length,
          analytics: validatedArgs.include_analytics ? analytics : undefined,
          filters_applied: {
            user_filter: !!validatedArgs.filter_by_user,
            type_filter: !!(validatedArgs.filter_by_type && validatedArgs.filter_by_type.length > 0),
            time_range: !!(validatedArgs.oldest || validatedArgs.latest),
          },
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_get_channel_history', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_get_channel_history',
        args,
        execution_time_ms: duration,
      });
    }
  },

  // Helper method to enhance messages with additional metadata
  async enhanceMessagesWithMetadata(messages: any[]): Promise<any[]> {
    // In a real implementation, this would fetch additional data like:
    // - User profiles for each message author
    // - Reaction details
    // - Thread reply counts
    // - File information for file shares
    
    return messages.map(message => ({
      ...message,
      enhanced_metadata: {
        word_count: message.text ? message.text.split(' ').length : 0,
        has_attachments: !!(message.attachments && message.attachments.length > 0),
        has_blocks: !!(message.blocks && message.blocks.length > 0),
        has_reactions: !!(message.reactions && message.reactions.length > 0),
        is_thread_parent: !!message.reply_count,
        is_thread_reply: !!message.thread_ts && message.thread_ts !== message.ts,
        estimated_read_time: message.text ? Math.ceil(message.text.split(' ').length / 200) : 0,
      },
    }));
  },

  // Helper method to generate message analytics
  generateMessageAnalytics(messages: any[], args: SlackGetChannelHistoryArgs): Record<string, any> {
    const totalMessages = messages.length;
    
    if (totalMessages === 0) {
      return {
        summary: { total_messages: 0 },
        note: 'No messages found for analysis',
      };
    }

    // Basic message statistics
    const messageTypes = messages.reduce((acc, msg) => {
      const type = msg.type || 'message';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userActivity = messages.reduce((acc, msg) => {
      if (msg.user) {
        acc[msg.user] = (acc[msg.user] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const messagesWithText = messages.filter(msg => msg.text);
    const totalWords = messagesWithText.reduce((acc, msg) => 
      acc + (msg.text ? msg.text.split(' ').length : 0), 0
    );

    const messagesWithReactions = messages.filter(msg => msg.reactions && msg.reactions.length > 0);
    const threadsCount = messages.filter(msg => msg.reply_count && msg.reply_count > 0).length;

    // Time-based analysis
    const timestamps = messages.map(msg => parseFloat(msg.ts)).filter(ts => !isNaN(ts));
    const timeRange = timestamps.length > 1 ? {
      earliest: new Date(Math.min(...timestamps) * 1000).toISOString(),
      latest: new Date(Math.max(...timestamps) * 1000).toISOString(),
      span_hours: (Math.max(...timestamps) - Math.min(...timestamps)) / 3600,
    } : null;

    return {
      summary: {
        total_messages: totalMessages,
        unique_users: Object.keys(userActivity).length,
        message_types: messageTypes,
        time_range: timeRange,
      },
      content_analysis: {
        messages_with_text: messagesWithText.length,
        total_words: totalWords,
        average_words_per_message: messagesWithText.length > 0 ? Math.round(totalWords / messagesWithText.length) : 0,
        messages_with_reactions: messagesWithReactions.length,
        reaction_rate: totalMessages > 0 ? Math.round((messagesWithReactions.length / totalMessages) * 100) : 0,
      },
      engagement_metrics: {
        threads_started: threadsCount,
        thread_rate: totalMessages > 0 ? Math.round((threadsCount / totalMessages) * 100) : 0,
        most_active_users: Object.entries(userActivity)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([user, count]) => ({ user, message_count: count })),
      },
      retrieval_info: {
        requested_limit: args.limit,
        actual_retrieved: totalMessages,
        filters_applied: !!(args.filter_by_user || args.filter_by_type),
        time_filtered: !!(args.oldest || args.latest),
      },
    };
  },
};
