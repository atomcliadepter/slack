
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Get Channel History Tool
 * Intelligent history retrieval with filtering, pagination, and message analysis
 */
export const slackGetChannelHistoryTool: MCPTool = {
  name: 'slack_get_channel_history',
  description: 'Retrieve channel message history with intelligent filtering, user resolution, and message analysis',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name to retrieve history from',
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
        description: 'Start of time range (ISO 8601 timestamp or Slack timestamp)',
      },
      latest: {
        type: 'string',
        description: 'End of time range (ISO 8601 timestamp or Slack timestamp)',
      },
      inclusive: {
        type: 'boolean',
        description: 'Include messages with oldest and latest timestamps',
        default: false,
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving more messages',
      },
      include_all_metadata: {
        type: 'boolean',
        description: 'Include all message metadata (reactions, replies, etc.)',
        default: true,
      },
      resolve_users: {
        type: 'boolean',
        description: 'Resolve user IDs to user information',
        default: true,
      },
      filter_bots: {
        type: 'boolean',
        description: 'Filter out bot messages',
        default: false,
      },
      filter_system: {
        type: 'boolean',
        description: 'Filter out system messages',
        default: false,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.getChannelHistory, args);
      
      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      
      // Convert ISO timestamps to Slack timestamps if needed
      const convertTimestamp = (timestamp?: string) => {
        if (!timestamp) return undefined;
        
        // If it's already a Slack timestamp (contains decimal)
        if (timestamp.includes('.')) return timestamp;
        
        // Convert ISO timestamp to Slack timestamp
        const date = new Date(timestamp);
        return (date.getTime() / 1000).toString();
      };

      // Prepare API parameters
      const apiParams: any = {
        channel: channelId,
        limit: validatedArgs.limit,
        inclusive: validatedArgs.inclusive,
      };

      if (validatedArgs.oldest) {
        apiParams.oldest = convertTimestamp(validatedArgs.oldest);
      }

      if (validatedArgs.latest) {
        apiParams.latest = convertTimestamp(validatedArgs.latest);
      }

      if (args.cursor) {
        apiParams.cursor = args.cursor;
      }

      // Retrieve messages
      const result = await slackClient.getClient().conversations.history(apiParams);
      
      if (!result.messages) {
        throw new Error('No messages returned from API');
      }

      let messages = result.messages;

      // Apply filters
      if (args.filter_bots) {
        messages = messages.filter(msg => !msg.bot_id && msg.subtype !== 'bot_message');
      }

      if (args.filter_system) {
        messages = messages.filter(msg => !msg.subtype || !msg.subtype.includes('channel_'));
      }

      // Resolve users if requested
      const userCache = new Map();
      if (args.resolve_users !== false) {
        const userIds = [...new Set(messages.map(msg => msg.user).filter(Boolean))];
        
        for (const userId of userIds) {
          if (!userCache.has(userId)) {
            try {
              const userInfo = await slackClient.getUserInfo(userId as string);
              if (userInfo.success) {
                userCache.set(userId, userInfo.user);
              }
            } catch (error) {
              logger.warn(`Failed to resolve user ${userId}:`, ErrorHandler.handleError(error));
            }
          }
        }
      }

      // Enhance messages with metadata
      const enhancedMessages = messages.map(msg => {
        const enhanced: any = {
          ...msg,
          timestamp_iso: new Date(parseFloat(msg.ts!) * 1000).toISOString(),
        };

        // Add user information
        if (msg.user && userCache.has(msg.user)) {
          enhanced.user_info = userCache.get(msg.user);
        }

        // Add message analysis
        if (args.include_all_metadata !== false) {
          enhanced.analysis = {
            has_reactions: !!(msg.reactions && msg.reactions.length > 0),
            has_replies: !!(msg.reply_count && msg.reply_count > 0),
            has_attachments: !!(msg.attachments && msg.attachments.length > 0),
            has_blocks: !!(msg.blocks && msg.blocks.length > 0),
            has_files: !!(msg.files && msg.files.length > 0),
            is_thread_parent: !!(msg.reply_count && msg.reply_count > 0),
            is_thread_reply: !!msg.thread_ts && msg.thread_ts !== msg.ts,
            word_count: msg.text ? msg.text.split(/\s+/).length : 0,
            character_count: msg.text ? msg.text.length : 0,
          };
        }

        return enhanced;
      });

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_get_channel_history', args, duration);

      return {
        success: true,
        messages: enhancedMessages,
        metadata: {
          channel_id: channelId,
          total_messages: enhancedMessages.length,
          has_more: result.has_more,
          next_cursor: result.response_metadata?.next_cursor,
          filters_applied: {
            bots_filtered: args.filter_bots || false,
            system_filtered: args.filter_system || false,
            users_resolved: args.resolve_users !== false,
          },
          time_range: {
            oldest: validatedArgs.oldest,
            latest: validatedArgs.latest,
            inclusive: validatedArgs.inclusive,
          },
          execution_time_ms: duration,
        },
        pagination: {
          has_more: result.has_more,
          next_cursor: result.response_metadata?.next_cursor,
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
};
