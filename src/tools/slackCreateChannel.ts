
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Create Channel Tool
 * Smart channel creation with templates, validation, and post-creation setup
 */
export const slackCreateChannelTool: MCPTool = {
  name: 'slack_create_channel',
  description: 'Create a new Slack channel with smart naming, templates, and automatic setup',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Channel name (lowercase, no spaces, max 21 characters)',
        pattern: '^[a-z0-9-_]+$',
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
      template: {
        type: 'string',
        description: 'Channel template to apply',
        enum: ['project', 'team', 'support', 'social', 'announcement', 'custom'],
      },
      invite_users: {
        type: 'array',
        description: 'Users to invite to the channel',
        items: {
          type: 'string',
        },
      },
      auto_archive_duration: {
        type: 'number',
        description: 'Auto-archive duration in minutes',
        enum: [60, 1440, 4320, 10080], // 1 hour, 1 day, 3 days, 1 week
      },
      send_welcome_message: {
        type: 'boolean',
        description: 'Send a welcome message to the channel',
        default: true,
      },
      welcome_message: {
        type: 'string',
        description: 'Custom welcome message (uses template default if not provided)',
      },
    },
    required: ['name'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.createChannel, args);
      
      // Apply channel name best practices
      let channelName = validatedArgs.name.toLowerCase();
      
      // Remove invalid characters and replace with hyphens
      channelName = channelName.replace(/[^a-z0-9-_]/g, '-');
      
      // Remove consecutive hyphens
      channelName = channelName.replace(/-+/g, '-');
      
      // Remove leading/trailing hyphens
      channelName = channelName.replace(/^-+|-+$/g, '');
      
      // Ensure it's not too long
      if (channelName.length > 21) {
        channelName = channelName.substring(0, 21);
      }

      // Check if channel already exists
      try {
        const existingChannel = await slackClient.getChannelInfo(channelName);
        if (existingChannel.success) {
          throw new Error(`Channel '${channelName}' already exists`);
        }
      } catch (error) {
        // Channel doesn't exist, which is what we want
      }

      // Apply template defaults
      const templates = {
        project: {
          topic: 'Project collaboration and updates',
          purpose: 'Dedicated space for project team collaboration',
          welcome_message: `Welcome to the ${channelName} project channel! 🚀\n\nThis channel is for:\n• Project updates and discussions\n• Sharing progress and milestones\n• Coordinating team activities\n\nLet's build something amazing together!`,
        },
        team: {
          topic: 'Team communication and coordination',
          purpose: 'Team collaboration and daily communication',
          welcome_message: `Welcome to the ${channelName} team channel! 👥\n\nThis is our space for:\n• Team updates and announcements\n• Daily coordination\n• Sharing ideas and feedback\n\nLooking forward to working together!`,
        },
        support: {
          topic: 'Customer support and issue tracking',
          purpose: 'Customer support coordination and issue resolution',
          welcome_message: `Welcome to the ${channelName} support channel! 🛟\n\nThis channel is for:\n• Customer support coordination\n• Issue tracking and resolution\n• Sharing solutions and best practices\n\nLet's provide excellent support together!`,
        },
        social: {
          topic: 'Social interactions and team building',
          purpose: 'Casual conversations and team bonding',
          welcome_message: `Welcome to ${channelName}! 🎉\n\nThis is our space for:\n• Casual conversations\n• Sharing interesting content\n• Team bonding activities\n\nFeel free to share and connect!`,
        },
        announcement: {
          topic: 'Important announcements and updates',
          purpose: 'Official announcements and company updates',
          welcome_message: `Welcome to ${channelName}! 📢\n\nThis channel is for:\n• Important announcements\n• Company updates\n• Official communications\n\nStay tuned for important updates!`,
        },
      };

      const template = args.template && templates[args.template as keyof typeof templates] 
        ? templates[args.template as keyof typeof templates] 
        : null;

      // Prepare channel creation parameters
      const createParams: any = {
        name: channelName,
        is_private: validatedArgs.is_private,
      };

      // Create the channel
      const createResult = await slackClient.getClient().conversations.create(createParams);
      
      if (!createResult.channel) {
        throw new Error('Failed to create channel');
      }

      const channelId = createResult.channel.id!;
      const setupResults: any[] = [];

      // Set topic if provided or from template
      const topic = validatedArgs.topic || template?.topic;
      if (topic) {
        try {
          await slackClient.getClient().conversations.setTopic({
            channel: channelId,
            topic,
          });
          setupResults.push({ action: 'set_topic', success: true });
        } catch (error) {
          setupResults.push({ 
            action: 'set_topic', 
            success: false, 
            error: ErrorHandler.handleError(error) 
          });
        }
      }

      // Set purpose if provided or from template
      const purpose = validatedArgs.purpose || template?.purpose;
      if (purpose) {
        try {
          await slackClient.getClient().conversations.setPurpose({
            channel: channelId,
            purpose,
          });
          setupResults.push({ action: 'set_purpose', success: true });
        } catch (error) {
          setupResults.push({ 
            action: 'set_purpose', 
            success: false, 
            error: ErrorHandler.handleError(error) 
          });
        }
      }

      // Invite users if specified
      if (args.invite_users && args.invite_users.length > 0) {
        try {
          const userIds = await Promise.all(
            args.invite_users.map((user: string) => slackClient.resolveUserId(user))
          );

          await slackClient.getClient().conversations.invite({
            channel: channelId,
            users: userIds.join(','),
          });
          
          setupResults.push({ 
            action: 'invite_users', 
            success: true, 
            users_invited: userIds.length 
          });
        } catch (error) {
          setupResults.push({ 
            action: 'invite_users', 
            success: false, 
            error: ErrorHandler.handleError(error) 
          });
        }
      }

      // Send welcome message
      if (args.send_welcome_message !== false) {
        const welcomeMessage = args.welcome_message || template?.welcome_message || 
          `Welcome to #${channelName}! This channel was created to facilitate team collaboration and communication.`;
        
        try {
          await slackClient.getClient().chat.postMessage({
            channel: channelId,
            text: welcomeMessage,
            unfurl_links: false,
          });
          setupResults.push({ action: 'send_welcome_message', success: true });
        } catch (error) {
          setupResults.push({ 
            action: 'send_welcome_message', 
            success: false, 
            error: ErrorHandler.handleError(error) 
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_create_channel', args, duration);

      return {
        success: true,
        channel: {
          id: channelId,
          name: channelName,
          is_private: validatedArgs.is_private,
          topic,
          purpose,
          created: new Date().toISOString(),
        },
        setup_results: setupResults,
        metadata: {
          original_name: validatedArgs.name,
          sanitized_name: channelName,
          template_applied: args.template || null,
          users_invited: args.invite_users?.length || 0,
          execution_time_ms: duration,
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
};
