import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Enhanced input validation schema
const inputSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(21, 'Channel name must be 21 characters or less').regex(/^[a-z0-9_-]+$/, 'Channel name must contain only lowercase letters, numbers, hyphens, and underscores'),
  is_private: z.boolean().optional().default(false),
  topic: z.string().max(250, 'Topic must be 250 characters or less').optional(),
  purpose: z.string().max(250, 'Purpose must be 250 characters or less').optional(),
  invite_users: z.array(z.string()).optional(),
  send_welcome_message: z.boolean().optional().default(false),
  welcome_message: z.string().optional(),
  template: z.enum(['general', 'project', 'team', 'support', 'announcement']).optional(),
  include_analytics: z.boolean().optional().default(true),
});

type SlackCreateChannelArgs = z.infer<typeof inputSchema>;

export const slackCreateChannelTool: MCPTool = {
  name: 'slack_create_channel',
  description: 'Create a new Slack channel with advanced configuration, user invitations, and template support',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Channel name (lowercase, max 21 chars, alphanumeric with hyphens/underscores)',
        pattern: '^[a-z0-9_-]+$',
        maxLength: 21,
      },
      is_private: {
        type: 'boolean',
        description: 'Create as private channel',
        default: false,
      },
      topic: {
        type: 'string',
        description: 'Channel topic (max 250 characters)',
        maxLength: 250,
      },
      purpose: {
        type: 'string',
        description: 'Channel purpose (max 250 characters)',
        maxLength: 250,
      },
      invite_users: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of user IDs or usernames to invite',
      },
      send_welcome_message: {
        type: 'boolean',
        description: 'Send welcome message after creation',
        default: false,
      },
      welcome_message: {
        type: 'string',
        description: 'Custom welcome message text',
      },
      template: {
        type: 'string',
        enum: ['general', 'project', 'team', 'support', 'announcement'],
        description: 'Channel template for predefined settings',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include channel creation analytics',
        default: true,
      },
    },
    required: ['name'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      const validatedArgs = Validator.validate(inputSchema, args) as SlackCreateChannelArgs;
      
      // Apply template settings if specified
      const channelConfig = this.applyTemplate(validatedArgs);
      
      // Create the channel
      const createResult = await slackClient.getClient().conversations.create({
        name: channelConfig.name,
        is_private: channelConfig.is_private,
      });

      if (!createResult.ok) {
        throw new Error(`Failed to create channel: ${createResult.error}`);
      }

      const channel = createResult.channel;
      const channelId = channel?.id;

      if (!channelId) {
        throw new Error('Channel creation succeeded but no channel ID returned');
      }

      // Set topic if provided
      if (channelConfig.topic) {
        await slackClient.getClient().conversations.setTopic({
          channel: channelId,
          topic: channelConfig.topic,
        });
      }

      // Set purpose if provided
      if (channelConfig.purpose) {
        await slackClient.getClient().conversations.setPurpose({
          channel: channelId,
          purpose: channelConfig.purpose,
        });
      }

      // Invite users if specified
      let invitedUsers: string[] = [];
      if (channelConfig.invite_users && channelConfig.invite_users.length > 0) {
        invitedUsers = await this.inviteUsers(channelId, channelConfig.invite_users);
      }

      // Send welcome message if requested
      let welcomeMessageResult = null;
      if (channelConfig.send_welcome_message) {
        welcomeMessageResult = await this.sendWelcomeMessage(channelId, channelConfig);
      }

      // Generate analytics if requested
      let analytics = {};
      if (validatedArgs.include_analytics) {
        analytics = this.generateChannelAnalytics(channel, channelConfig, invitedUsers);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_create_channel', args, duration);

      return {
        success: true,
        data: {
          channel: {
            id: channelId,
            name: channel?.name,
            is_private: channel?.is_private,
            created: channel?.created,
            creator: channel?.creator,
            topic: channelConfig.topic,
            purpose: channelConfig.purpose,
          },
          invited_users: invitedUsers,
          welcome_message_sent: !!welcomeMessageResult,
          welcome_message_ts: welcomeMessageResult?.ts,
        },
        metadata: {
          execution_time_ms: duration,
          analytics: validatedArgs.include_analytics ? analytics : undefined,
          template_applied: channelConfig.template,
          configuration: {
            is_private: channelConfig.is_private,
            has_topic: !!channelConfig.topic,
            has_purpose: !!channelConfig.purpose,
            users_invited: invitedUsers.length,
            welcome_message_sent: !!welcomeMessageResult,
          },
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_create_channel', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_create_channel',
        args,
        execution_time_ms: duration,
      });
    }
  },

  // Helper method to apply template settings
  applyTemplate(args: SlackCreateChannelArgs): SlackCreateChannelArgs {
    if (!args.template) return args;

    const templates = {
      general: {
        topic: args.topic || 'General discussion and updates',
        purpose: args.purpose || 'A place for general team communication',
        welcome_message: args.welcome_message || 'Welcome to the general discussion channel! 👋',
      },
      project: {
        topic: args.topic || 'Project coordination and updates',
        purpose: args.purpose || 'Dedicated channel for project collaboration',
        welcome_message: args.welcome_message || 'Welcome to the project channel! Let\'s build something great together! 🚀',
      },
      team: {
        topic: args.topic || 'Team communication and coordination',
        purpose: args.purpose || 'Private space for team discussions',
        is_private: args.is_private ?? true,
        welcome_message: args.welcome_message || 'Welcome to the team channel! This is our private space for collaboration. 👥',
      },
      support: {
        topic: args.topic || 'Customer support and help requests',
        purpose: args.purpose || 'Channel for handling support requests and issues',
        welcome_message: args.welcome_message || 'Welcome to the support channel! We\'re here to help. 🆘',
      },
      announcement: {
        topic: args.topic || 'Important announcements and updates',
        purpose: args.purpose || 'Channel for company-wide announcements',
        welcome_message: args.welcome_message || 'Welcome to the announcements channel! Stay updated with important news. 📢',
      },
    };

    const template = templates[args.template];
    return {
      ...args,
      ...template,
    };
  },

  // Helper method to invite users to the channel
  async inviteUsers(channelId: string, userIds: string[]): Promise<string[]> {
    const invitedUsers: string[] = [];
    
    for (const userId of userIds) {
      try {
        // Resolve user ID if username provided
        const resolvedUserId = userId.startsWith('U') ? userId : await slackClient.resolveUserId(userId);
        
        const inviteResult = await slackClient.getClient().conversations.invite({
          channel: channelId,
          users: resolvedUserId,
        });

        if (inviteResult.ok) {
          invitedUsers.push(resolvedUserId);
        }
      } catch (error) {
        // Log error but continue with other invitations
        logger.error(`Failed to invite user ${userId}:`, error);
      }
    }

    return invitedUsers;
  },

  // Helper method to send welcome message
  async sendWelcomeMessage(channelId: string, config: SlackCreateChannelArgs) {
    if (!config.welcome_message) return null;

    try {
      const result = await slackClient.getClient().chat.postMessage({
        channel: channelId,
        text: config.welcome_message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: config.welcome_message,
            },
          },
        ],
      });

      return result.ok ? result : null;
    } catch (error) {
      logger.error('Failed to send welcome message:', error);
      return null;
    }
  },

  // Helper method to generate channel analytics
  generateChannelAnalytics(channel: any, config: SlackCreateChannelArgs, invitedUsers: string[]): Record<string, any> {
    return {
      channel_info: {
        name_length: config.name.length,
        is_private: config.is_private,
        has_topic: !!config.topic,
        has_purpose: !!config.purpose,
        topic_length: config.topic?.length || 0,
        purpose_length: config.purpose?.length || 0,
      },
      setup_configuration: {
        template_used: config.template || 'none',
        users_invited: invitedUsers.length,
        welcome_message_sent: config.send_welcome_message,
        welcome_message_length: config.welcome_message?.length || 0,
      },
      creation_metrics: {
        created_timestamp: channel?.created,
        creator_id: channel?.creator,
        channel_type: config.is_private ? 'private' : 'public',
      },
      recommendations: this.generateChannelRecommendations(config, invitedUsers),
    };
  },

  // Helper method to generate channel recommendations
  generateChannelRecommendations(config: SlackCreateChannelArgs, invitedUsers: string[]): string[] {
    const recommendations = [];

    if (!config.topic) {
      recommendations.push('Consider adding a topic to help users understand the channel purpose');
    }

    if (!config.purpose) {
      recommendations.push('Adding a purpose can provide more context about the channel\'s intended use');
    }

    if (invitedUsers.length === 0 && !config.is_private) {
      recommendations.push('Consider inviting relevant team members to get the conversation started');
    }

    if (!config.send_welcome_message) {
      recommendations.push('A welcome message can help set expectations and encourage participation');
    }

    if (config.name.length < 3) {
      recommendations.push('Longer channel names are often more descriptive and easier to find');
    }

    return recommendations;
  },
};
