/**
 * Enhanced Slack Join Channel Tool v2.0.0
 * Comprehensive channel joining with validation, permission checking, and analytics
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { exponentialBackoff } from '@/utils/performance';
import { z } from 'zod';

/**
 * Input validation schema
 */
const inputSchema = z.object({
  channel: z.string()
    .min(1, 'Channel is required')
    .refine(
      (val) => /^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$/i.test(val),
      'Channel must be a valid channel ID (C1234567890) or channel name (#general)'
    ),
  validate_permissions: z.boolean().default(true),
  check_membership: z.boolean().default(true),
  include_channel_info: z.boolean().default(true),
  include_member_count: z.boolean().default(true),
  include_join_analytics: z.boolean().default(true),
  auto_retry: z.boolean().default(false),
  retry_attempts: z.number().min(1).max(5).default(3),
  send_join_message: z.boolean().default(false),
  join_message: z.string().optional(),
  include_recommendations: z.boolean().default(true),
});

type SlackJoinChannelArgs = z.infer<typeof inputSchema>;

/**
 * Join analytics interface
 */
interface JoinAnalytics {
  join_success: boolean;
  was_already_member: boolean;
  channel_type: 'public' | 'private' | 'im' | 'mpim' | 'unknown';
  member_count_before?: number;
  member_count_after?: number;
  join_method: 'direct' | 'retry' | 'permission_override';
  permission_level: 'admin' | 'member' | 'guest' | 'restricted' | 'unknown';
  channel_activity_level: 'high' | 'medium' | 'low' | 'unknown';
  join_timing: {
    permission_check_ms?: number;
    membership_check_ms?: number;
    join_operation_ms: number;
    total_operation_ms: number;
  };
  potential_issues: string[];
  success_factors: string[];
}

/**
 * Channel information interface
 */
interface ChannelInfo {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_member: boolean;
  is_org_shared: boolean;
  is_ext_shared: boolean;
  is_pending_ext_shared: boolean;
  created: number;
  creator: string;
  name_normalized: string;
  num_members?: number;
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  previous_names?: string[];
  locale?: string;
}

/**
 * Join result interface
 */
interface JoinResult {
  success: boolean;
  channel_joined: boolean;
  already_member: boolean;
  channel_info?: ChannelInfo;
  member_count?: number;
  join_analytics?: JoinAnalytics;
  recommendations?: string[];
  warnings?: string[];
  join_message_sent?: boolean;
}

export const slackJoinChannelTool: MCPTool = {
  name: 'slack_join_channel',
  description: 'Join a Slack channel with advanced validation, permission checking, and comprehensive analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or channel name (#general) to join',
      },
      validate_permissions: {
        type: 'boolean',
        description: 'Validate user permissions before attempting to join',
        default: true,
      },
      check_membership: {
        type: 'boolean',
        description: 'Check if already a member before joining',
        default: true,
      },
      include_channel_info: {
        type: 'boolean',
        description: 'Include detailed channel information in response',
        default: true,
      },
      include_member_count: {
        type: 'boolean',
        description: 'Include current member count after joining',
        default: true,
      },
      include_join_analytics: {
        type: 'boolean',
        description: 'Include analytics about the join operation',
        default: true,
      },
      auto_retry: {
        type: 'boolean',
        description: 'Automatically retry on transient failures',
        default: false,
      },
      retry_attempts: {
        type: 'number',
        description: 'Number of retry attempts (1-5)',
        minimum: 1,
        maximum: 5,
        default: 3,
      },
      send_join_message: {
        type: 'boolean',
        description: 'Send a message after successfully joining',
        default: false,
      },
      join_message: {
        type: 'string',
        description: 'Custom message to send after joining (if send_join_message is true)',
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for channel engagement',
        default: true,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackJoinChannelArgs;
      const client = slackClient.getClient();
      
      // Resolve channel ID from name if needed
      const channelId = await this.resolveChannelId(validatedArgs.channel);
      
      let joinAnalytics: JoinAnalytics = {
        join_success: false,
        was_already_member: false,
        channel_type: 'unknown',
        join_method: 'direct',
        permission_level: 'unknown',
        channel_activity_level: 'unknown',
        join_timing: {
          join_operation_ms: 0,
          total_operation_ms: 0,
        },
        potential_issues: [],
        success_factors: [],
      };

      let channelInfo: ChannelInfo | undefined;
      let memberCount: number | undefined;
      let alreadyMember = false;
      let joinSuccess = false;
      let warnings: string[] = [];
      let joinMessageSent = false;

      // Step 1: Get channel information
      if (validatedArgs.include_channel_info || validatedArgs.check_membership) {
        const channelInfoStart = Date.now();
        try {
          const infoResult = await client.conversations.info({
            channel: channelId,
            include_num_members: validatedArgs.include_member_count,
          });

          if (infoResult.ok && infoResult.channel) {
            channelInfo = infoResult.channel as ChannelInfo;
            memberCount = channelInfo.num_members;
            alreadyMember = channelInfo.is_member || false;
            
            // Analyze channel type
            joinAnalytics.channel_type = this.determineChannelType(channelInfo);
            joinAnalytics.member_count_before = memberCount;
            joinAnalytics.was_already_member = alreadyMember;
            
            // Analyze channel activity level
            joinAnalytics.channel_activity_level = this.analyzeChannelActivity(channelInfo);
          }
        } catch (error) {
          warnings.push('Could not retrieve channel information - proceeding with join attempt');
          logger.warn('Channel info retrieval failed:', error);
        }
      }

      // Step 2: Check if already a member
      if (validatedArgs.check_membership && alreadyMember) {
        joinAnalytics.join_success = true;
        joinAnalytics.was_already_member = true;
        joinAnalytics.success_factors.push('Already a member of the channel');
        
        const duration = Date.now() - startTime;
        joinAnalytics.join_timing.total_operation_ms = duration;
        
        logger.logToolExecution('slack_join_channel', args, duration);

        return {
          success: true,
          data: {
            success: true,
            channel_joined: false,
            already_member: true,
            channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
            member_count: validatedArgs.include_member_count ? memberCount : undefined,
            join_analytics: validatedArgs.include_join_analytics ? joinAnalytics : undefined,
            recommendations: validatedArgs.include_recommendations ? 
              this.generateRecommendations(channelInfo, joinAnalytics, true) : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
          } as JoinResult,
          metadata: {
            execution_time_ms: duration,
            channel_id: channelId,
            operation_type: 'membership_check',
            already_member: true,
          },
        };
      }

      // Step 3: Validate permissions if requested
      if (validatedArgs.validate_permissions) {
        const permissionStart = Date.now();
        try {
          const authResult = await client.auth.test();
          if (authResult.ok) {
            joinAnalytics.permission_level = this.determinePermissionLevel(authResult);
            joinAnalytics.join_timing.permission_check_ms = Date.now() - permissionStart;
            
            if (channelInfo?.is_private && joinAnalytics.permission_level === 'guest') {
              joinAnalytics.potential_issues.push('Guest users may not be able to join private channels');
            }
          }
        } catch (error) {
          warnings.push('Permission validation failed - proceeding with join attempt');
          joinAnalytics.potential_issues.push('Could not validate user permissions');
        }
      }

      // Step 4: Attempt to join the channel
      const joinStart = Date.now();
      let attempts = 0;
      const maxAttempts = validatedArgs.auto_retry ? validatedArgs.retry_attempts : 1;

      while (attempts < maxAttempts && !joinSuccess) {
        attempts++;
        
        try {
          const joinResult = await client.conversations.join({
            channel: channelId,
          });

          if (joinResult.ok) {
            joinSuccess = true;
            joinAnalytics.join_success = true;
            joinAnalytics.join_method = attempts > 1 ? 'retry' : 'direct';
            joinAnalytics.success_factors.push(`Successfully joined on attempt ${attempts}`);
            
            // Update channel info after joining
            if (joinResult.channel) {
              channelInfo = { ...channelInfo, ...joinResult.channel } as ChannelInfo;
              channelInfo.is_member = true;
            }
            
            break;
          } else {
            const errorMsg = joinResult.error || 'Unknown error';
            joinAnalytics.potential_issues.push(`Join attempt ${attempts} failed: ${errorMsg}`);
            
            if (attempts === maxAttempts) {
              throw new Error(`Failed to join channel after ${attempts} attempts: ${errorMsg}`);
            }
            
            // Wait before retry with exponential backoff
            if (attempts < maxAttempts) {
              await exponentialBackoff(attempts);
            }
          }
        } catch (error) {
          joinAnalytics.potential_issues.push(`Join attempt ${attempts} error: ${error}`);
          
          if (attempts === maxAttempts) {
            throw error;
          }
        }
      }

      joinAnalytics.join_timing.join_operation_ms = Date.now() - joinStart;

      // Step 5: Get updated member count
      if (joinSuccess && validatedArgs.include_member_count) {
        try {
          const updatedInfo = await client.conversations.info({
            channel: channelId,
            include_num_members: true,
          });
          
          if (updatedInfo.ok && updatedInfo.channel) {
            memberCount = updatedInfo.channel.num_members;
            joinAnalytics.member_count_after = memberCount;
          }
        } catch (error) {
          warnings.push('Could not retrieve updated member count');
        }
      }

      // Step 6: Send join message if requested
      if (joinSuccess && validatedArgs.send_join_message) {
        try {
          const message = validatedArgs.join_message || 
            `👋 Hello! I've joined this channel and I'm excited to be part of the conversation!`;
          
          const messageResult = await client.chat.postMessage({
            channel: channelId,
            text: message,
          });
          
          if (messageResult.ok) {
            joinMessageSent = true;
            joinAnalytics.success_factors.push('Join message sent successfully');
          } else {
            warnings.push('Failed to send join message');
          }
        } catch (error) {
          warnings.push('Error sending join message');
        }
      }

      const duration = Date.now() - startTime;
      joinAnalytics.join_timing.total_operation_ms = duration;
      
      logger.logToolExecution('slack_join_channel', args, duration);

      return {
        success: true,
        data: {
          success: joinSuccess,
          channel_joined: joinSuccess,
          already_member: false,
          channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
          member_count: validatedArgs.include_member_count ? memberCount : undefined,
          join_analytics: validatedArgs.include_join_analytics ? joinAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? 
            this.generateRecommendations(channelInfo, joinAnalytics, false) : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
          join_message_sent: joinMessageSent,
        } as JoinResult,
        metadata: {
          execution_time_ms: duration,
          channel_id: channelId,
          operation_type: 'channel_join',
          attempts_made: attempts,
          join_successful: joinSuccess,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_join_channel', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_join_channel',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Resolve channel ID from name or ID
   */
  async resolveChannelId(channel: string): Promise<string> {
    // If it's already a channel ID, return it
    if (/^C[A-Z0-9]{8,}$/.test(channel)) {
      return channel;
    }

    // Remove # prefix if present
    const channelName = channel.replace(/^#/, '');
    
    try {
      const client = slackClient.getClient();
      const result = await client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 1000,
      });

      if (result.ok && result.channels) {
        const foundChannel = result.channels.find(
          (ch: any) => ch.name === channelName || ch.name_normalized === channelName
        );
        
        if (foundChannel && foundChannel.id) {
          return foundChannel.id;
        }
      }
      
      throw new Error(`Channel '${channel}' not found`);
    } catch (error) {
      throw new Error(`Failed to resolve channel '${channel}': ${error}`);
    }
  },

  /**
   * Determine channel type from channel info
   */
  determineChannelType(channelInfo: ChannelInfo): 'public' | 'private' | 'im' | 'mpim' | 'unknown' {
    if (channelInfo.is_im) return 'im';
    if (channelInfo.is_mpim) return 'mpim';
    if (channelInfo.is_private) return 'private';
    if (channelInfo.is_channel) return 'public';
    return 'unknown';
  },

  /**
   * Analyze channel activity level
   */
  analyzeChannelActivity(channelInfo: ChannelInfo): 'high' | 'medium' | 'low' | 'unknown' {
    const memberCount = channelInfo.num_members || 0;
    const isGeneral = channelInfo.is_general;
    const hasRecentActivity = channelInfo.topic?.last_set && 
      (Date.now() / 1000 - channelInfo.topic.last_set) < 86400 * 7; // 7 days

    if (isGeneral || memberCount > 100) return 'high';
    if (memberCount > 20 || hasRecentActivity) return 'medium';
    if (memberCount > 5) return 'low';
    return 'unknown';
  },

  /**
   * Determine user permission level
   */
  determinePermissionLevel(authResult: any): 'admin' | 'member' | 'guest' | 'restricted' | 'unknown' {
    if (authResult.is_admin) return 'admin';
    if (authResult.is_owner) return 'admin';
    if (authResult.is_restricted) return 'restricted';
    if (authResult.is_ultra_restricted) return 'guest';
    return 'member';
  },

  /**
   * Generate recommendations for channel engagement
   */
  generateRecommendations(
    channelInfo?: ChannelInfo, 
    analytics?: JoinAnalytics, 
    alreadyMember?: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (alreadyMember) {
      recommendations.push('You are already a member of this channel');
      recommendations.push('Consider reviewing recent messages to catch up on discussions');
      return recommendations;
    }

    if (analytics?.join_success) {
      recommendations.push('Successfully joined the channel! 🎉');
      
      if (channelInfo?.purpose?.value) {
        recommendations.push(`Channel purpose: ${channelInfo.purpose.value}`);
      }
      
      if (channelInfo?.topic?.value) {
        recommendations.push(`Current topic: ${channelInfo.topic.value}`);
      }
      
      if (analytics.channel_activity_level === 'high') {
        recommendations.push('This is a high-activity channel - consider enabling notifications');
      } else if (analytics.channel_activity_level === 'low') {
        recommendations.push('This is a low-activity channel - perfect for focused discussions');
      }
      
      if (channelInfo?.is_general) {
        recommendations.push('This is the general channel - great for team-wide announcements');
      }
      
      if (channelInfo?.is_private) {
        recommendations.push('This is a private channel - discussions here are confidential');
      }
      
      recommendations.push('Introduce yourself to the channel members');
      recommendations.push('Review pinned messages for important information');
    }

    return recommendations;
  },
};

export default slackJoinChannelTool;
