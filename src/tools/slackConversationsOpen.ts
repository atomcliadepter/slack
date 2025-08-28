/**
 * Slack Conversations Open Tool
 * Opens a direct message or multi-party direct message conversation
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { SlackAPIErrorHandler } from '@/utils/slackErrors';
import { z } from 'zod';

const inputSchema = z.object({
  users: z.string().describe('Comma-separated list of user IDs to open conversation with'),
  return_im: z.boolean().optional().describe('Return IM channel if only one user specified'),
  include_analytics: z.boolean().optional().describe('Include conversation analytics'),
});

interface ConversationOpenResult {
  success: boolean;
  conversation: {
    id: string;
    is_im: boolean;
    is_mpim: boolean;
    user?: string;
    users?: string[];
    created: number;
  };
  analytics?: {
    conversation_type: 'dm' | 'group_dm';
    participant_count: number;
    is_new_conversation: boolean;
  };
  metadata: {
    execution_time_ms: number;
  };
}

export const slackConversationsOpenTool: MCPTool = {
  name: 'slack_conversations_open',
  description: 'Open a direct message or multi-party direct message conversation with specified users',
  inputSchema: {
    type: 'object',
    properties: {
      users: {
        type: 'string',
        description: 'Comma-separated list of user IDs to open conversation with'
      },
      return_im: {
        type: 'boolean',
        description: 'Return IM channel if only one user specified'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include conversation analytics'
      }
    },
    required: ['users'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(inputSchema, args);
      
      // Parse users list
      const userIds = validatedArgs.users.split(',').map(u => u.trim()).filter(u => u);
      
      if (userIds.length === 0) {
        throw new Error('At least one user ID must be provided');
      }

      // Open conversation
      const result = await slackClient.getClient().conversations.open({
        users: userIds.join(','),
        return_im: validatedArgs.return_im,
      });

      if (!result.ok) {
        return SlackAPIErrorHandler.createErrorResponse(result as any, {
          tool: 'slack_conversations_open',
          users: validatedArgs.users,
        });
      }

      const conversation = result.channel;
      if (!conversation) {
        throw new Error('No conversation returned from Slack API');
      }

      // Generate analytics if requested
      let analytics;
      if (validatedArgs.include_analytics) {
        analytics = {
          conversation_type: conversation.is_im ? 'dm' : 'group_dm',
          participant_count: userIds.length,
          is_new_conversation: !conversation.created || (Date.now() / 1000 - conversation.created) < 60,
        };
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_open', args, duration);

      return {
        success: true,
        data: {
          success: true,
          conversation: {
            id: conversation.id,
            is_im: conversation.is_im || false,
            is_mpim: (conversation as any).is_mpim || false,
            user: conversation.user,
            users: (conversation as any).members || userIds,
            created: conversation.created || Math.floor(Date.now() / 1000),
          },
          analytics,
          metadata: {
            execution_time_ms: duration,
          },
        } as ConversationOpenResult,
        metadata: {
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_open', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_open',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
