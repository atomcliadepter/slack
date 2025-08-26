
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Send Message Tool
 * Supports advanced messaging with blocks, attachments, scheduling, and formatting
 */
export const slackSendMessageTool: MCPTool = {
  name: 'slack_send_message',
  description: 'Send an enhanced message to a Slack channel with support for blocks, attachments, threading, and rich formatting',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID, channel name (with or without #), or user ID/username for DM',
      },
      text: {
        type: 'string',
        description: 'Message text (supports Slack markdown formatting)',
      },
      thread_ts: {
        type: 'string',
        description: 'Timestamp of parent message to reply in thread',
      },
      blocks: {
        type: 'array',
        description: 'Slack Block Kit blocks for rich formatting',
        items: {
          type: 'object',
        },
      },
      attachments: {
        type: 'array',
        description: 'Legacy message attachments',
        items: {
          type: 'object',
        },
      },
      unfurl_links: {
        type: 'boolean',
        description: 'Enable automatic link unfurling',
        default: true,
      },
      unfurl_media: {
        type: 'boolean',
        description: 'Enable automatic media unfurling',
        default: true,
      },
      parse: {
        type: 'string',
        description: 'Parse mode for message formatting',
        enum: ['full', 'none'],
        default: 'full',
      },
      reply_broadcast: {
        type: 'boolean',
        description: 'Broadcast thread reply to channel',
        default: false,
      },
      link_names: {
        type: 'boolean',
        description: 'Find and link channel names and usernames',
        default: true,
      },
    },
    required: ['channel', 'text'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.sendMessage, args);
      
      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      
      // Prepare message payload
      const messagePayload: any = {
        channel: channelId,
        text: validatedArgs.text,
        unfurl_links: validatedArgs.unfurl_links,
        unfurl_media: validatedArgs.unfurl_media,
        parse: args.parse || 'full',
        link_names: args.link_names !== false,
      };

      // Add optional parameters
      if (validatedArgs.thread_ts) {
        messagePayload.thread_ts = validatedArgs.thread_ts;
        messagePayload.reply_broadcast = args.reply_broadcast || false;
      }

      if (validatedArgs.blocks) {
        messagePayload.blocks = validatedArgs.blocks;
      }

      if (validatedArgs.attachments) {
        messagePayload.attachments = validatedArgs.attachments;
      }

      // Send message
      const result = await slackClient.getClient().chat.postMessage(messagePayload);
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_send_message', args, duration);

      return {
        success: true,
        message: {
          ts: result.ts,
          channel: result.channel,
          text: validatedArgs.text,
          permalink: `https://slack.com/archives/${channelId}/p${result.ts?.replace('.', '')}`,
        },
        metadata: {
          channel_id: channelId,
          thread_ts: validatedArgs.thread_ts,
          has_blocks: !!validatedArgs.blocks,
          has_attachments: !!validatedArgs.attachments,
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_send_message', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_send_message',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
