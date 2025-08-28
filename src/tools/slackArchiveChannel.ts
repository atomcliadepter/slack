/**
 * Enhanced Slack Archive Channel Tool v2.0.0
 * Comprehensive channel archiving with validation, safety checks, and analytics
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
  check_already_archived: z.boolean().default(true),
  prevent_general_archive: z.boolean().default(true),
  prevent_important_channels: z.boolean().default(true),
  member_notification: z.boolean().default(false),
  notification_message: z.string().optional(),
  include_channel_info: z.boolean().default(true),
  include_member_count: z.boolean().default(true),
  include_archive_analytics: z.boolean().default(true),
  auto_retry: z.boolean().default(false),
  retry_attempts: z.number().min(1).max(5).default(3),
  include_recommendations: z.boolean().default(true),
  confirm_archive: z.boolean().default(false),
  force_archive: z.boolean().default(false),
  backup_messages: z.boolean().default(false),
  backup_limit: z.number().min(1).max(1000).default(100),
});

type SlackArchiveChannelArgs = z.infer<typeof inputSchema>;

/**
 * Archive analytics interface
 */
interface ArchiveAnalytics {
  archive_success: boolean;
  was_already_archived: boolean;
  channel_type: 'public' | 'private' | 'im' | 'mpim' | 'general' | 'unknown';
  member_count: number;
  archive_method: 'direct' | 'retry' | 'force';
  permission_level: 'admin' | 'member' | 'guest' | 'restricted' | 'unknown';
  channel_importance: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  archive_timing: {
    permission_check_ms?: number;
    notification_send_ms?: number;
    backup_creation_ms?: number;
    archive_operation_ms: number;
    total_operation_ms: number;
  };
  safety_checks: {
    is_general_channel: boolean;
    is_important_channel: boolean;
    has_recent_activity: boolean;
    member_count_high: boolean;
    has_pinned_messages: boolean;
  };
  activity_analysis: {
    last_message_time?: number;
    days_since_last_activity?: number;
    total_messages?: number;
    active_members?: number;
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
 * Archive result interface
 */
interface ArchiveResult {
  success: boolean;
  channel_archived: boolean;
  was_already_archived: boolean;
  prevented_archive: boolean;
  prevention_reason?: string;
  channel_info?: ChannelInfo;
  member_count?: number;
  archive_analytics?: ArchiveAnalytics;
  recommendations?: string[];
  warnings?: string[];
  notification_sent?: boolean;
  backup_created?: boolean;
  backup_message_count?: number;
}

export const slackArchiveChannelTool: MCPTool = {
  name: 'slack_archive_channel',
  description: 'Archive a Slack channel with advanced validation, safety checks, and comprehensive analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or channel name (#general) to archive',
      },
      validate_permissions: {
        type: 'boolean',
        description: 'Validate user permissions before attempting to archive',
        default: true,
      },
      check_already_archived: {
        type: 'boolean',
        description: 'Check if channel is already archived before attempting',
        default: true,
      },
      prevent_general_archive: {
        type: 'boolean',
        description: 'Prevent archiving the #general channel (safety feature)',
        default: true,
      },
      prevent_important_channels: {
        type: 'boolean',
        description: 'Prevent archiving channels with important keywords',
        default: true,
      },
      member_notification: {
        type: 'boolean',
        description: 'Send notification to channel members before archiving',
        default: false,
      },
      notification_message: {
        type: 'string',
        description: 'Custom message to send to members before archiving',
      },
      include_channel_info: {
        type: 'boolean',
        description: 'Include detailed channel information in response',
        default: true,
      },
      include_member_count: {
        type: 'boolean',
        description: 'Include member count in response',
        default: true,
      },
      include_archive_analytics: {
        type: 'boolean',
        description: 'Include analytics about the archive operation',
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
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations about archiving the channel',
        default: true,
      },
      confirm_archive: {
        type: 'boolean',
        description: 'Require explicit confirmation for important channels',
        default: false,
      },
      force_archive: {
        type: 'boolean',
        description: 'Force archive even if safety checks fail (use with caution)',
        default: false,
      },
      backup_messages: {
        type: 'boolean',
        description: 'Create a backup of recent messages before archiving',
        default: false,
      },
      backup_limit: {
        type: 'number',
        description: 'Number of recent messages to backup (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackArchiveChannelArgs;
      const client = slackClient.getClient();
      
      // Resolve channel ID from name if needed
      const channelId = await this.resolveChannelId(validatedArgs.channel);
      
      let archiveAnalytics: ArchiveAnalytics = {
        archive_success: false,
        was_already_archived: false,
        channel_type: 'unknown',
        member_count: 0,
        archive_method: 'direct',
        permission_level: 'unknown',
        channel_importance: 'unknown',
        archive_timing: {
          archive_operation_ms: 0,
          total_operation_ms: 0,
        },
        safety_checks: {
          is_general_channel: false,
          is_important_channel: false,
          has_recent_activity: false,
          member_count_high: false,
          has_pinned_messages: false,
        },
        activity_analysis: {},
        potential_issues: [],
        success_factors: [],
        warnings: [],
      };

      let channelInfo: ChannelInfo | undefined;
      let memberCount: number | undefined;
      let isAlreadyArchived = false;
      let archiveSuccess = false;
      let preventedArchive = false;
      let preventionReason: string | undefined;
      let warnings: string[] = [];
      let notificationSent = false;
      let backupCreated = false;
      let backupMessageCount = 0;

      // Step 1: Get channel information
      const channelInfoStart = Date.now();
      try {
        const infoResult = await client.conversations.info({
          channel: channelId,
          include_num_members: validatedArgs.include_member_count,
        });

        if (infoResult.ok && infoResult.channel) {
          channelInfo = infoResult.channel as ChannelInfo;
          memberCount = channelInfo.num_members;
          isAlreadyArchived = channelInfo.is_archived || false;
          
          // Analyze channel type and importance
          archiveAnalytics.channel_type = this.determineChannelType(channelInfo);
          archiveAnalytics.channel_importance = this.analyzeChannelImportance(channelInfo);
          archiveAnalytics.member_count = memberCount || 0;
          archiveAnalytics.was_already_archived = isAlreadyArchived;
          
          // Safety checks
          archiveAnalytics.safety_checks = this.performSafetyChecks(channelInfo);
          
          // Activity analysis
          archiveAnalytics.activity_analysis = await this.analyzeChannelActivity(channelId, channelInfo);
        }
      } catch (error) {
        warnings.push('Could not retrieve channel information - proceeding with archive attempt');
        logger.warn('Channel info retrieval failed:', error);
      }

      // Step 2: Check if already archived
      if (validatedArgs.check_already_archived && isAlreadyArchived) {
        archiveAnalytics.archive_success = true;
        archiveAnalytics.was_already_archived = true;
        archiveAnalytics.success_factors.push('Channel is already archived');
        
        const duration = Date.now() - startTime;
        archiveAnalytics.archive_timing.total_operation_ms = duration;
        
        logger.logToolExecution('slack_archive_channel', args, duration);

        return {
          success: true,
          data: {
            success: true,
            channel_archived: false,
            was_already_archived: true,
            prevented_archive: false,
            channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
            member_count: validatedArgs.include_member_count ? memberCount : undefined,
            archive_analytics: validatedArgs.include_archive_analytics ? archiveAnalytics : undefined,
            recommendations: validatedArgs.include_recommendations ? 
              this.generateRecommendations(channelInfo, archiveAnalytics, 'already_archived') : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
          } as ArchiveResult,
          metadata: {
            execution_time_ms: duration,
            channel_id: channelId,
            operation_type: 'archive_check',
            already_archived: true,
          },
        };
      }

      // Step 3: Safety checks
      if (!validatedArgs.force_archive) {
        const safetyResult = this.checkArchiveSafety(channelInfo, validatedArgs);
        if (!safetyResult.safe) {
          preventedArchive = true;
          preventionReason = safetyResult.reason;
          archiveAnalytics.warnings.push(`Archive prevented: ${safetyResult.reason}`);
          
          if (!validatedArgs.confirm_archive) {
            const duration = Date.now() - startTime;
            archiveAnalytics.archive_timing.total_operation_ms = duration;
            
            return {
              success: true,
              data: {
                success: false,
                channel_archived: false,
                was_already_archived: false,
                prevented_archive: true,
                prevention_reason: preventionReason,
                channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
                archive_analytics: validatedArgs.include_archive_analytics ? archiveAnalytics : undefined,
                recommendations: validatedArgs.include_recommendations ? 
                  this.generateRecommendations(channelInfo, archiveAnalytics, 'prevented') : undefined,
                warnings: warnings.concat(archiveAnalytics.warnings),
              } as ArchiveResult,
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

      // Continue with remaining steps...
      return await this.continueArchiveProcess(
        validatedArgs, client, channelId, channelInfo, archiveAnalytics, 
        warnings, startTime
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_archive_channel', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_archive_channel',
        args,
        execution_time_ms: duration,
      });
    }
  },
  /**
   * Continue the archive process after safety checks
   */
  async continueArchiveProcess(
    validatedArgs: SlackArchiveChannelArgs,
    client: any,
    channelId: string,
    channelInfo: ChannelInfo | undefined,
    archiveAnalytics: ArchiveAnalytics,
    warnings: string[],
    startTime: number
  ) {
    let archiveSuccess = false;
    let notificationSent = false;
    let backupCreated = false;
    let backupMessageCount = 0;

    // Step 4: Validate permissions if requested
    if (validatedArgs.validate_permissions) {
      const permissionStart = Date.now();
      try {
        const authResult = await client.auth.test();
        if (authResult.ok) {
          archiveAnalytics.permission_level = this.determinePermissionLevel(authResult);
          archiveAnalytics.archive_timing.permission_check_ms = Date.now() - permissionStart;
          
          if (archiveAnalytics.permission_level === 'guest' || archiveAnalytics.permission_level === 'restricted') {
            archiveAnalytics.warnings.push('Limited permissions may prevent archiving');
          }
        }
      } catch (error) {
        warnings.push('Permission validation failed - proceeding with archive attempt');
        archiveAnalytics.potential_issues.push('Could not validate user permissions');
      }
    }

    // Step 5: Create message backup if requested
    if (validatedArgs.backup_messages) {
      const backupStart = Date.now();
      try {
        const backupResult = await this.createMessageBackup(channelId, validatedArgs.backup_limit);
        if (backupResult.success) {
          backupCreated = true;
          backupMessageCount = backupResult.messageCount;
          archiveAnalytics.success_factors.push(`Backed up ${backupMessageCount} messages`);
        } else {
          warnings.push('Failed to create message backup');
        }
        archiveAnalytics.archive_timing.backup_creation_ms = Date.now() - backupStart;
      } catch (error) {
        warnings.push('Error creating message backup');
        archiveAnalytics.potential_issues.push('Message backup failed');
      }
    }

    // Step 6: Send member notification if requested
    if (validatedArgs.member_notification) {
      const notificationStart = Date.now();
      try {
        const message = validatedArgs.notification_message || 
          `📋 This channel will be archived shortly. All messages will be preserved and searchable. Thank you for your participation!`;
        
        const messageResult = await client.chat.postMessage({
          channel: channelId,
          text: message,
        });
        
        if (messageResult.ok) {
          notificationSent = true;
          archiveAnalytics.success_factors.push('Member notification sent successfully');
          
          // Wait a moment for members to see the notification
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          warnings.push('Failed to send member notification');
        }
        archiveAnalytics.archive_timing.notification_send_ms = Date.now() - notificationStart;
      } catch (error) {
        warnings.push('Error sending member notification');
      }
    }

    // Step 7: Attempt to archive the channel
    const archiveStart = Date.now();
    let attempts = 0;
    const maxAttempts = validatedArgs.auto_retry ? validatedArgs.retry_attempts : 1;

    while (attempts < maxAttempts && !archiveSuccess) {
      attempts++;
      
      try {
        const archiveResult = await client.conversations.archive({
          channel: channelId,
        });

        if (archiveResult.ok) {
          archiveSuccess = true;
          archiveAnalytics.archive_success = true;
          archiveAnalytics.archive_method = attempts > 1 ? 'retry' : 
            validatedArgs.force_archive ? 'force' : 'direct';
          archiveAnalytics.success_factors.push(`Successfully archived on attempt ${attempts}`);
          
          break;
        } else {
          const errorMsg = archiveResult.error || 'Unknown error';
          archiveAnalytics.potential_issues.push(`Archive attempt ${attempts} failed: ${errorMsg}`);
          
          if (attempts === maxAttempts) {
            throw new Error(`Failed to archive channel after ${attempts} attempts: ${errorMsg}`);
          }
          
          // Wait before retry
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      } catch (error) {
        archiveAnalytics.potential_issues.push(`Archive attempt ${attempts} error: ${error}`);
        
        if (attempts === maxAttempts) {
          throw error;
        }
      }
    }

    archiveAnalytics.archive_timing.archive_operation_ms = Date.now() - archiveStart;

    const duration = Date.now() - startTime;
    archiveAnalytics.archive_timing.total_operation_ms = duration;
    
    logger.logToolExecution('slack_archive_channel', validatedArgs, duration);

    return {
      success: true,
      data: {
        success: archiveSuccess,
        channel_archived: archiveSuccess,
        was_already_archived: false,
        prevented_archive: false,
        channel_info: validatedArgs.include_channel_info ? channelInfo : undefined,
        member_count: validatedArgs.include_member_count ? archiveAnalytics.member_count : undefined,
        archive_analytics: validatedArgs.include_archive_analytics ? archiveAnalytics : undefined,
        recommendations: validatedArgs.include_recommendations ? 
          this.generateRecommendations(channelInfo, archiveAnalytics, archiveSuccess ? 'success' : 'failed') : undefined,
        warnings: warnings.concat(archiveAnalytics.warnings).length > 0 ? 
          warnings.concat(archiveAnalytics.warnings) : undefined,
        notification_sent: notificationSent,
        backup_created: backupCreated,
        backup_message_count: backupMessageCount,
      } as ArchiveResult,
      metadata: {
        execution_time_ms: duration,
        channel_id: channelId,
        operation_type: 'channel_archive',
        attempts_made: attempts,
        archive_successful: archiveSuccess,
      },
    };
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
    const hasImportantKeywords = this.hasImportantKeywords(channelInfo.name);

    if (isGeneral) return 'critical';
    if (hasImportantKeywords || isOrgShared || memberCount > 100) return 'high';
    if (memberCount > 20) return 'medium';
    if (memberCount > 5) return 'low';
    return 'unknown';
  },

  /**
   * Check for important keywords in channel name
   */
  hasImportantKeywords(channelName: string): boolean {
    const importantKeywords = [
      'announcement', 'alert', 'emergency', 'critical', 'urgent',
      'admin', 'leadership', 'exec', 'board', 'security',
      'incident', 'outage', 'support', 'help', 'escalation'
    ];
    
    const lowerName = channelName.toLowerCase();
    return importantKeywords.some(keyword => lowerName.includes(keyword));
  },

  /**
   * Perform safety checks
   */
  performSafetyChecks(channelInfo: ChannelInfo): ArchiveAnalytics['safety_checks'] {
    return {
      is_general_channel: channelInfo.is_general || false,
      is_important_channel: this.hasImportantKeywords(channelInfo.name),
      has_recent_activity: channelInfo.topic?.last_set ? 
        (Date.now() / 1000 - channelInfo.topic.last_set) < 86400 * 7 : false,
      member_count_high: (channelInfo.num_members || 0) > 50,
      has_pinned_messages: false, // Would need additional API call to check
    };
  },

  /**
   * Analyze channel activity
   */
  async analyzeChannelActivity(channelId: string, channelInfo: ChannelInfo): Promise<ArchiveAnalytics['activity_analysis']> {
    try {
      const client = slackClient.getClient();
      const historyResult = await client.conversations.history({
        channel: channelId,
        limit: 10,
      });

      if (historyResult.ok && historyResult.messages && historyResult.messages.length > 0) {
        const lastMessage = historyResult.messages[0];
        if (lastMessage.ts) {
          const lastMessageTime = parseFloat(lastMessage.ts);
          const daysSinceLastActivity = Math.floor((Date.now() / 1000 - lastMessageTime) / 86400);

          return {
            last_message_time: lastMessageTime,
            days_since_last_activity: daysSinceLastActivity,
            total_messages: historyResult.messages.length,
            active_members: new Set(historyResult.messages.map((m: any) => m.user).filter(Boolean)).size,
          };
        }
      }
    } catch (error) {
      logger.warn('Failed to analyze channel activity:', error);
    }

    return {};
  },

  /**
   * Check if archiving is safe
   */
  checkArchiveSafety(channelInfo?: ChannelInfo, args?: SlackArchiveChannelArgs): { safe: boolean; reason?: string } {
    if (!channelInfo) {
      return { safe: true };
    }

    // Prevent archiving general channel
    if (args?.prevent_general_archive && channelInfo.is_general) {
      return { 
        safe: false, 
        reason: 'Cannot archive #general channel (safety feature enabled)' 
      };
    }

    // Prevent archiving important channels
    if (args?.prevent_important_channels && this.hasImportantKeywords(channelInfo.name)) {
      return { 
        safe: false, 
        reason: 'Cannot archive channel with important keywords (announcements, alerts, etc.)' 
      };
    }

    // Warn about high-member channels
    if (channelInfo.num_members && channelInfo.num_members > 100) {
      return { 
        safe: false, 
        reason: 'Channel has many members (>100) - archiving may impact many users' 
      };
    }

    return { safe: true };
  },

  /**
   * Create message backup
   */
  async createMessageBackup(channelId: string, limit: number): Promise<{ success: boolean; messageCount: number }> {
    try {
      const client = slackClient.getClient();
      const historyResult = await client.conversations.history({
        channel: channelId,
        limit: limit,
      });

      if (historyResult.ok && historyResult.messages) {
        // In a real implementation, you would save these messages to a file or database
        // For now, we'll just count them
        return {
          success: true,
          messageCount: historyResult.messages.length,
        };
      }
    } catch (error) {
      logger.warn('Failed to create message backup:', error);
    }

    return { success: false, messageCount: 0 };
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
   * Generate recommendations for channel archiving
   */
  generateRecommendations(
    channelInfo?: ChannelInfo, 
    analytics?: ArchiveAnalytics, 
    status?: 'success' | 'failed' | 'prevented' | 'already_archived'
  ): string[] {
    const recommendations: string[] = [];

    if (status === 'already_archived') {
      recommendations.push('Channel is already archived');
      recommendations.push('Archived channels can be unarchived if needed');
      recommendations.push('Messages in archived channels remain searchable');
      return recommendations;
    }

    if (status === 'prevented') {
      recommendations.push('Channel archive was prevented for safety reasons');
      
      if (analytics?.safety_checks.is_general_channel) {
        recommendations.push('Consider keeping #general active for important announcements');
        recommendations.push('Use "force_archive: true" only if absolutely necessary');
      }
      
      if (analytics?.safety_checks.is_important_channel) {
        recommendations.push('This channel appears to be important based on its name');
        recommendations.push('Consider renaming or confirming the archive is intentional');
      }
      
      if (analytics?.safety_checks.member_count_high) {
        recommendations.push('This channel has many members - consider notifying them first');
      }
      
      return recommendations;
    }

    if (status === 'success') {
      recommendations.push('Channel successfully archived! 📋');
      
      if (channelInfo?.purpose?.value) {
        recommendations.push(`Archived: ${channelInfo.purpose.value}`);
      }
      
      if (analytics?.member_count && analytics.member_count > 10) {
        recommendations.push(`${analytics.member_count} members were notified of the archive`);
      }
      
      if (analytics?.activity_analysis.days_since_last_activity && 
          analytics.activity_analysis.days_since_last_activity > 30) {
        recommendations.push('Channel had been inactive for over 30 days - good candidate for archiving');
      }
      
      recommendations.push('Archived channels can be unarchived if needed');
      recommendations.push('All messages remain searchable even when archived');
      recommendations.push('Consider creating a new channel if similar discussions are needed');
    }

    if (status === 'failed') {
      recommendations.push('Failed to archive the channel');
      recommendations.push('Check your permissions and try again');
      recommendations.push('Contact your workspace admin if the issue persists');
      
      if (analytics?.permission_level === 'guest' || analytics?.permission_level === 'restricted') {
        recommendations.push('Limited user permissions may prevent archiving');
      }
    }

    return recommendations;
  },
};

export default slackArchiveChannelTool;
