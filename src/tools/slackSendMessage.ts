import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Enhanced input validation schema
const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  text: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  attachments: z.array(z.any()).optional(),
  thread_ts: z.string().optional(),
  reply_broadcast: z.boolean().optional(),
  unfurl_links: z.boolean().optional(),
  unfurl_media: z.boolean().optional(),
  parse: z.enum(['full', 'none']).optional(),
  link_names: z.boolean().optional(),
  username: z.string().optional(),
  icon_emoji: z.string().optional(),
  icon_url: z.string().url().optional(),
  mrkdwn: z.boolean().optional(),
  metadata: z.object({
    event_type: z.string().optional(),
    event_payload: z.record(z.any()).optional(),
  }).optional(),
});

type SlackSendMessageArgs = z.infer<typeof inputSchema>;

export const slackSendMessageTool: MCPTool = {
  name: 'slack_send_message',
  description: 'Send a message to a Slack channel with advanced formatting, threading, and metadata support',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name (with # prefix) to send message to',
      },
      text: {
        type: 'string',
        description: 'Message text (required if blocks not provided)',
      },
      blocks: {
        type: 'array',
        description: 'Block Kit blocks for rich message formatting',
        items: { type: 'object' },
      },
      attachments: {
        type: 'array',
        description: 'Legacy message attachments',
        items: { type: 'object' },
      },
      thread_ts: {
        type: 'string',
        description: 'Timestamp of parent message to reply in thread',
      },
      reply_broadcast: {
        type: 'boolean',
        description: 'Broadcast thread reply to channel',
        default: false,
      },
      unfurl_links: {
        type: 'boolean',
        description: 'Enable link unfurling',
        default: true,
      },
      unfurl_media: {
        type: 'boolean',
        description: 'Enable media unfurling',
        default: true,
      },
      parse: {
        type: 'string',
        enum: ['full', 'none'],
        description: 'Parse mode for message text',
        default: 'none',
      },
      link_names: {
        type: 'boolean',
        description: 'Find and link channel names and usernames',
        default: false,
      },
      username: {
        type: 'string',
        description: 'Custom username for message (bot only)',
      },
      icon_emoji: {
        type: 'string',
        description: 'Custom emoji icon for message (bot only)',
      },
      icon_url: {
        type: 'string',
        description: 'Custom icon URL for message (bot only)',
      },
      mrkdwn: {
        type: 'boolean',
        description: 'Enable markdown parsing',
        default: true,
      },
      metadata: {
        type: 'object',
        description: 'Message metadata for app functionality',
        properties: {
          event_type: { type: 'string' },
          event_payload: { type: 'object' },
        },
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      const validatedArgs = Validator.validate(inputSchema, args) as SlackSendMessageArgs;
      
      // Validate that either text or blocks are provided
      if (!validatedArgs.text && !validatedArgs.blocks) {
        throw new Error('Either text or blocks must be provided');
      }

      // Resolve channel ID if channel name provided
      let channelId = validatedArgs.channel;
      if (validatedArgs.channel.startsWith('#')) {
        channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      }

      // Prepare message payload
      const messagePayload: any = {
        channel: channelId,
        text: validatedArgs.text,
        blocks: validatedArgs.blocks,
        attachments: validatedArgs.attachments,
        thread_ts: validatedArgs.thread_ts,
        reply_broadcast: validatedArgs.reply_broadcast,
        unfurl_links: validatedArgs.unfurl_links,
        unfurl_media: validatedArgs.unfurl_media,
        parse: validatedArgs.parse,
        link_names: validatedArgs.link_names,
        username: validatedArgs.username,
        icon_emoji: validatedArgs.icon_emoji,
        icon_url: validatedArgs.icon_url,
        mrkdwn: validatedArgs.mrkdwn,
        metadata: validatedArgs.metadata,
      };

      // Remove undefined values
      Object.keys(messagePayload).forEach(key => {
        if (messagePayload[key] === undefined) {
          delete messagePayload[key];
        }
      });

      // Send message via Slack API
      const result = await slackClient.getClient().chat.postMessage(messagePayload);

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      // Calculate message analytics
      const messageAnalytics = {
        character_count: validatedArgs.text?.length || 0,
        block_count: validatedArgs.blocks?.length || 0,
        attachment_count: validatedArgs.attachments?.length || 0,
        is_threaded: !!validatedArgs.thread_ts,
        has_custom_formatting: !!(validatedArgs.blocks || validatedArgs.attachments),
        estimated_read_time: Math.ceil((validatedArgs.text?.length || 0) / 200), // words per minute
      };

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_send_message', args, duration);

      return {
        success: true,
        data: {
          message: result.message,
          channel: result.channel,
          ts: result.ts,
          permalink: `https://slack.com/archives/${result.channel}/p${result.ts?.replace('.', '')}`,
        },
        metadata: {
          execution_time_ms: duration,
          analytics: messageAnalytics,
          api_response: {
            ok: result.ok,
            warning: (result as any).warning,
          },
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
