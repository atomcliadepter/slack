/**
 * Enhanced Slack Leave Channel Tool v2.0.0
 * Comprehensive channel leaving with validation, safety checks, and analytics
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
    .min(1, 'Channel is required')
    .refine(
      (val) => /^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$/i.test(val),
      'Channel must be a valid channel ID (C1234567890) or channel name (#general)'
    ),
  validate_permissions: z.boolean().default(true),
  check_membership: z.boolean().default(true),
  prevent_general_leave: z.boolean().default(true),
  include_channel_info: z.boolean().default(true),
  include_member_count: z.boolean().default(true),
  include_leave_analytics: z.boolean().default(true),
  auto_retry: z.boolean().default(false),
  retry_attempts: z.number().min(1).max(5).default(3),
  send_leave_message: z.boolean().default(false),
  leave_message: z.string().optional(),
  include_recommendations: z.boolean().default(true),
  confirm_leave: z.boolean().default(false),
  force_leave: z.boolean().default(false),
});

type SlackLeaveChannelArgs = z.infer<typeof inputSchema>;

/**
 * Leave analytics interface
 */
interface LeaveAnalytics {
  leave_success: boolean;
  was_member: boolean;
  channel_type: 'public' | 'private' | 'im' | 'mpim' | 'general' | 'unknown';
  member_count_before?: number;
  member_count_after?: number;
  leave_method: 'direct' | 'retry' | 'force';
  permission_level: 'admin' | 'member' | 'guest' | 'restricted' | 'unknown';
  channel_importance: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  leave_timing: {
    permission_check_ms?: number;
    membership_check_ms?: number;
    leave_operation_ms: number;
    total_operation_ms: number;
  };
  safety_checks: {
    is_general_channel: boolean;
    is_only_admin: boolean;
    has_recent_activity: boolean;
    member_count_low: boolean;
  };
  potential_issues: string[];
  success_factors: string[];
  warnings: string[];
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
 * Leave result interface
 */
interface LeaveResult {
  success: boolean;
  channel_left: boolean;
  was_not_member: boolean;
  prevented_leave: boolean;
  prevention_reason?: string;
  channel_info?: ChannelInfo;
  member_count?: number;
  leave_analytics?: LeaveAnalytics;
  recommendations?: string[];
  warnings?: string[];
  leave_message_sent?: boolean;
}

export const slackLeaveChannelTool: MCPTool = {
  name: 'slack_leave_channel',
  description: 'Leave a Slack channel with advanced validation, safety checks, and comprehensive analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or channel name (#general) to leave',
      },
      validate_permissions: {
        type: 'boolean',
        description: 'Validate user permissions before attempting to leave',
        default: true,
      },
      check_membership: {
        type: 'boolean',
        description: 'Check if currently a member before leaving',
        default: true,
      },
      prevent_general_leave: {
        type: 'boolean',
        description: 'Prevent leaving the #general channel (safety feature)',
        default: true,
      },
      include_channel_info: {
        type: 'boolean',
        description: 'Include detailed channel information in response',
        default: true,
      },
      include_member_count: {
        type: 'boolean',
        description: 'Include remaining member count after leaving',
        default: true,
      },
      include_leave_analytics: {
        type: 'boolean',
        description: 'Include analytics about the leave operation',
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
      send_leave_message: {
        type: 'boolean',
        description: 'Send a message before leaving the channel',
        default: false,
      },
      leave_message: {
        type: 'string',
        description: 'Custom message to send before leaving (if send_leave_message is true)',
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations about leaving the channel',
        default: true,
      },
      confirm_leave: {
        type: 'boolean',
        description: 'Require explicit confirmation for important channels',
        default: false,
      },
      force_leave: {
        type: 'boolean',
        description: 'Force leave even if safety checks fail (use with caution)',
        default: false,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackLeaveChannelArgs;
      const client = slackClient.getClient();
      
      // Resolve channel ID from name if needed
      const channelId = await this.resolveChannelId(validatedArgs.channel);
      
      let leaveAnalytics: LeaveAnalytics = {
        leave_success: false,
        was_member: false,
        channel_type: 'unknown',
        leave_method: 'direct',
        permission_level: 'unknown',
        channel_importance: 'unknown',
        leave_timing: {
          leave_operation_ms: 0,
          total_operation_ms: 0,
        },
        safety_checks: {
          is_general_channel: false,
          is_only_admin: false,
          has_recent_activity: false,
          member_count_low: false,
        },
        potential_issues: [],
        success_factors: [],
        warnings: [],
      };

      let channelInfo: ChannelInfo | undefined;
      let memberCount: number | undefined;
      let isMember = false;
      let leaveSuccess = false;
      let preventedLeave = false;
      let preventionReason: string | undefined;
      let warnings: string[] = [];
      let leaveMessageSent = false;

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
            isMember = channelInfo.is_member || false;
            
            // Analyze channel type and importance
            leaveAnalytics.channel_type = this.determineChannelType(channelInfo);
            leaveAnalytics.channel_importance = this.analyzeChannelImportance(channelInfo);
            leaveAnalytics.member_count_before = memberCount;
            leaveAnalytics.was_member = isMember;
            
            // Safety checks
            leaveAnalytics.safety_checks = this.performSafetyChecks(channelInfo);
          }
        } catch (error) {
          warnings.push('Could not retrieve channel information - proceeding with leave attempt');
          logger.warn('Channel info retrieval failed:', error);
        }
      }

      // Step 2: Check if currently a member
      if (validatedArgs.check_membership && !isMember) {
        leaveAnalytics.leave_success = true;
        leaveAnalytics.was_member = false;
        leaveAnalytics.success_factors.push('Not a member of the channel');
        
        const duration = Date.now() - startTime;
        leaveAnalytics.leave_timing.total_operation_ms = duration;
        
        logger.logToolExecution('slack_leave_channel', args, duration);

        return {
          success: true,
          data: {
            success: true,
            channel_left: false,
            was_not_member: true,
            prevented_leave: false,
            channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
            member_count: validatedArgs.include_member_count ? memberCount : undefined,
            leave_analytics: validatedArgs.include_leave_analytics ? leaveAnalytics : undefined,
            recommendations: validatedArgs.include_recommendations ? 
              this.generateRecommendations(channelInfo, leaveAnalytics, 'not_member') : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
          } as LeaveResult,
          metadata: {
            execution_time_ms: duration,
            channel_id: channelId,
            operation_type: 'membership_check',
            was_member: false,
          },
        };
      }

      // Step 3: Safety checks
      if (!validatedArgs.force_leave) {
        const safetyResult = this.checkLeaveSafety(channelInfo, validatedArgs);
        if (!safetyResult.safe) {
          preventedLeave = true;
          preventionReason = safetyResult.reason;
          leaveAnalytics.warnings.push(`Leave prevented: ${safetyResult.reason}`);
          
          if (!validatedArgs.confirm_leave) {
            const duration = Date.now() - startTime;
            leaveAnalytics.leave_timing.total_operation_ms = duration;
            
            return {
              success: true,
              data: {
                success: false,
                channel_left: false,
                was_not_member: false,
                prevented_leave: true,
                prevention_reason: preventionReason,
                channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
                leave_analytics: validatedArgs.include_leave_analytics ? leaveAnalytics : undefined,
                recommendations: validatedArgs.include_recommendations ? 
                  this.generateRecommendations(channelInfo, leaveAnalytics, 'prevented') : undefined,
                warnings: warnings.concat(leaveAnalytics.warnings),
              } as LeaveResult,
              metadata: {
                execution_time_ms: duration,
                channel_id: channelId,
                operation_type: 'safety_check',
                prevented: true,
                reason: preventionReason,
              },
            };
          }
        }
      }

      // Step 4: Validate permissions if requested
      if (validatedArgs.validate_permissions) {
        const permissionStart = Date.now();
        try {
          const authResult = await client.auth.test();
          if (authResult.ok) {
            leaveAnalytics.permission_level = this.determinePermissionLevel(authResult);
            leaveAnalytics.leave_timing.permission_check_ms = Date.now() - permissionStart;
            
            // Check if user is the only admin
            if (channelInfo?.is_private && leaveAnalytics.permission_level === 'admin') {
              const adminCheck = await this.checkIfOnlyAdmin(channelId);
              if (adminCheck.isOnlyAdmin) {
                leaveAnalytics.safety_checks.is_only_admin = true;
                leaveAnalytics.warnings.push('You are the only admin in this private channel');
              }
            }
          }
        } catch (error) {
          warnings.push('Permission validation failed - proceeding with leave attempt');
          leaveAnalytics.potential_issues.push('Could not validate user permissions');
        }
      }

      // Step 5: Send leave message if requested
      if (validatedArgs.send_leave_message && isMember) {
        try {
          const message = validatedArgs.leave_message || 
            `👋 Thanks for the great discussions! I'm leaving this channel now. Feel free to reach out if needed!`;
          
          const messageResult = await client.chat.postMessage({
            channel: channelId,
            text: message,
          });
          
          if (messageResult.ok) {
            leaveMessageSent = true;
            leaveAnalytics.success_factors.push('Leave message sent successfully');
          } else {
            warnings.push('Failed to send leave message');
          }
        } catch (error) {
          warnings.push('Error sending leave message');
        }
      }

      // Step 6: Attempt to leave the channel
      const leaveStart = Date.now();
      let attempts = 0;
      const maxAttempts = validatedArgs.auto_retry ? validatedArgs.retry_attempts : 1;

      while (attempts < maxAttempts && !leaveSuccess) {
        attempts++;
        
        try {
          const leaveResult = await client.conversations.leave({
            channel: channelId,
          });

          if (leaveResult.ok) {
            leaveSuccess = true;
            leaveAnalytics.leave_success = true;
            leaveAnalytics.leave_method = attempts > 1 ? 'retry' : 
              validatedArgs.force_leave ? 'force' : 'direct';
            leaveAnalytics.success_factors.push(`Successfully left on attempt ${attempts}`);
            
            break;
          } else {
            const errorMsg = leaveResult.error || 'Unknown error';
            leaveAnalytics.potential_issues.push(`Leave attempt ${attempts} failed: ${errorMsg}`);
            
            if (attempts === maxAttempts) {
              throw new Error(`Failed to leave channel after ${attempts} attempts: ${errorMsg}`);
            }
            
            // Wait before retry
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        } catch (error) {
          leaveAnalytics.potential_issues.push(`Leave attempt ${attempts} error: ${error}`);
          
          if (attempts === maxAttempts) {
            throw error;
          }
        }
      }

      leaveAnalytics.leave_timing.leave_operation_ms = Date.now() - leaveStart;

      // Step 7: Get updated member count
      if (leaveSuccess && validatedArgs.include_member_count) {
        try {
          const updatedInfo = await client.conversations.info({
            channel: channelId,
            include_num_members: true,
          });
          
          if (updatedInfo.ok && updatedInfo.channel) {
            memberCount = updatedInfo.channel.num_members;
            leaveAnalytics.member_count_after = memberCount;
          }
        } catch (error) {
          warnings.push('Could not retrieve updated member count');
        }
      }

      const duration = Date.now() - startTime;
      leaveAnalytics.leave_timing.total_operation_ms = duration;
      
      logger.logToolExecution('slack_leave_channel', args, duration);

      return {
        success: true,
        data: {
          success: leaveSuccess,
          channel_left: leaveSuccess,
          was_not_member: false,
          prevented_leave: preventedLeave,
          prevention_reason: preventionReason,
          channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
          member_count: validatedArgs.include_member_count ? memberCount : undefined,
          leave_analytics: validatedArgs.include_leave_analytics ? leaveAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? 
            this.generateRecommendations(channelInfo, leaveAnalytics, leaveSuccess ? 'success' : 'failed') : undefined,
          warnings: warnings.concat(leaveAnalytics.warnings).length > 0 ? 
            warnings.concat(leaveAnalytics.warnings) : undefined,
          leave_message_sent: leaveMessageSent,
        } as LeaveResult,
        metadata: {
          execution_time_ms: duration,
          channel_id: channelId,
          operation_type: 'channel_leave',
          attempts_made: attempts,
          leave_successful: leaveSuccess,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_leave_channel', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_leave_channel',
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
  determineChannelType(channelInfo: ChannelInfo): 'public' | 'private' | 'im' | 'mpim' | 'general' | 'unknown' {
    if (channelInfo.is_im) return 'im';
    if (channelInfo.is_mpim) return 'mpim';
    if (channelInfo.is_general) return 'general';
    if (channelInfo.is_private) return 'private';
    if (channelInfo.is_channel) return 'public';
    return 'unknown';
  },

  /**
   * Analyze channel importance
   */
  analyzeChannelImportance(channelInfo: ChannelInfo): 'critical' | 'high' | 'medium' | 'low' | 'unknown' {
    const memberCount = channelInfo.num_members || 0;
    const isGeneral = channelInfo.is_general;
    const isOrgShared = channelInfo.is_org_shared;
    const hasRecentActivity = channelInfo.topic?.last_set && 
      (Date.now() / 1000 - channelInfo.topic.last_set) < 86400 * 7; // 7 days

    if (isGeneral) return 'critical';
    if (isOrgShared || memberCount > 100) return 'high';
    if (memberCount > 20 || hasRecentActivity) return 'medium';
    if (memberCount > 5) return 'low';
    return 'unknown';
  },

  /**
   * Perform safety checks
   */
  performSafetyChecks(channelInfo: ChannelInfo): LeaveAnalytics['safety_checks'] {
    return {
      is_general_channel: channelInfo.is_general || false,
      is_only_admin: false, // Will be checked separately
      has_recent_activity: channelInfo.topic?.last_set ? 
        (Date.now() / 1000 - channelInfo.topic.last_set) < 86400 * 7 : false,
      member_count_low: (channelInfo.num_members || 0) <= 3,
    };
  },

  /**
   * Check if leaving is safe
   */
  checkLeaveSafety(channelInfo?: ChannelInfo, args?: SlackLeaveChannelArgs): { safe: boolean; reason?: string } {
    if (!channelInfo) {
      return { safe: true };
    }

    // Prevent leaving general channel
    if (args?.prevent_general_leave && channelInfo.is_general) {
      return { 
        safe: false, 
        reason: 'Cannot leave #general channel (safety feature enabled)' 
      };
    }

    // Warn about small channels
    if (channelInfo.num_members && channelInfo.num_members <= 2) {
      return { 
        safe: false, 
        reason: 'Channel has very few members - leaving may disrupt conversations' 
      };
    }

    return { safe: true };
  },

  /**
   * Check if user is the only admin
   */
  async checkIfOnlyAdmin(channelId: string): Promise<{ isOnlyAdmin: boolean; adminCount: number }> {
    try {
      const client = slackClient.getClient();
      const membersResult = await client.conversations.members({
        channel: channelId,
        limit: 1000,
      });

      if (membersResult.ok && membersResult.members) {
        // This is a simplified check - in reality, you'd need to check each member's admin status
        // For now, we'll assume if there are multiple members, there are likely other admins
        return {
          isOnlyAdmin: membersResult.members.length <= 1,
          adminCount: membersResult.members.length > 1 ? 2 : 1, // Simplified
        };
      }
    } catch (error) {
      logger.warn('Failed to check admin status:', error);
    }

    return { isOnlyAdmin: false, adminCount: 1 };
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
   * Generate recommendations for channel leaving
   */
  generateRecommendations(
    channelInfo?: ChannelInfo, 
    analytics?: LeaveAnalytics, 
    status?: 'success' | 'failed' | 'prevented' | 'not_member'
  ): string[] {
    const recommendations: string[] = [];

    if (status === 'not_member') {
      recommendations.push('You are not a member of this channel');
      recommendations.push('No action needed - you have already left or were never a member');
      return recommendations;
    }

    if (status === 'prevented') {
      recommendations.push('Channel leave was prevented for safety reasons');
      
      if (analytics?.safety_checks.is_general_channel) {
        recommendations.push('Consider staying in #general for important announcements');
        recommendations.push('Use "force_leave: true" only if absolutely necessary');
      }
      
      if (analytics?.safety_checks.member_count_low) {
        recommendations.push('This channel has very few members - consider the impact on others');
      }
      
      return recommendations;
    }

    if (status === 'success') {
      recommendations.push('Successfully left the channel! 👋');
      
      if (channelInfo?.purpose?.value) {
        recommendations.push(`You left: ${channelInfo.purpose.value}`);
      }
      
      if (analytics?.channel_importance === 'high' || analytics?.channel_importance === 'critical') {
        recommendations.push('⚠️  You left an important channel - you can rejoin anytime if needed');
      }
      
      if (analytics?.safety_checks.has_recent_activity) {
        recommendations.push('This channel had recent activity - consider following up on any ongoing discussions');
      }
      
      recommendations.push('You can rejoin this channel anytime using the join channel tool');
      recommendations.push('Consider muting instead of leaving if you want to reduce notifications');
    }

    if (status === 'failed') {
      recommendations.push('Failed to leave the channel');
      recommendations.push('Check your permissions and try again');
      recommendations.push('Contact your workspace admin if the issue persists');
    }

    return recommendations;
  },
};

export default slackLeaveChannelTool;
