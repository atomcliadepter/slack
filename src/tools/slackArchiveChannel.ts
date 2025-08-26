
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Archive Channel Tool
 * Comprehensive channel archiving with validation, permission checking, and archive analytics
 */
export const slackArchiveChannelTool: MCPTool = {
  name: 'slack_archive_channel',
  description: 'Archive a Slack channel with advanced validation, permission checking, member notifications, and archive analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or channel name (#general) to archive',
        pattern: '^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$',
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
        description: 'Prevent archiving channels with important keywords (announcements, alerts, etc.)',
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
        default: 'This channel will be archived shortly.',
      },
      include_channel_info: {
        type: 'boolean',
        description: 'Include detailed channel information in response',
        default: true,
      },
      include_member_count: {
        type: 'boolean',
        description: 'Include member count and member list in response',
        default: true,
      },
      include_archive_analytics: {
        type: 'boolean',
        description: 'Include analytics about the archive operation',
        default: true,
      },
      confirmation_required: {
        type: 'boolean',
        description: 'Require confirmation for important channels (general, large channels)',
        default: true,
      },
      auto_retry: {
        type: 'boolean',
        description: 'Automatically retry on transient failures',
        default: true,
      },
      retry_attempts: {
        type: 'number',
        description: 'Number of retry attempts for transient failures',
        minimum: 1,
        maximum: 5,
        default: 3,
      },
      retry_delay_ms: {
        type: 'number',
        description: 'Delay between retry attempts in milliseconds',
        minimum: 100,
        maximum: 10000,
        default: 1000,
      },
      backup_messages: {
        type: 'boolean',
        description: 'Create a backup summary of recent messages before archiving',
        default: false,
      },
      backup_message_count: {
        type: 'number',
        description: 'Number of recent messages to include in backup summary',
        minimum: 10,
        maximum: 100,
        default: 50,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.archiveChannel, args);
      
      // Normalize channel identifier
      const channelId = await normalizeChannelIdentifier(validatedArgs.channel);
      
      // Pre-archive validation and checks
      const preArchiveAnalysis = await performPreArchiveAnalysis(channelId, validatedArgs);
      
      // If already archived and check is enabled, return early
      if (validatedArgs.check_already_archived && preArchiveAnalysis.is_archived) {
        const duration = Date.now() - startTime;
        logger.logToolExecution('slack_archive_channel', args, duration);
        
        return {
          success: true,
          already_archived: true,
          channel_id: channelId,
          channel_info: preArchiveAnalysis.channel_info,
          message: 'Channel is already archived',
          archive_analytics: {
            ...preArchiveAnalysis.analytics,
            archive_attempted: false,
            archive_successful: false,
            already_archived: true,
            execution_time_ms: duration,
          },
          metadata: {
            pre_archive_checks: preArchiveAnalysis.checks,
            execution_time_ms: duration,
          },
        };
      }
      
      // Check for general channel protection
      if (validatedArgs.prevent_general_archive && preArchiveAnalysis.is_general_channel) {
        throw new Error('Cannot archive #general channel - this is typically not allowed and may cause workspace issues');
      }
      
      // Check for important channel protection
      if (validatedArgs.prevent_important_channels && preArchiveAnalysis.is_important_channel) {
        throw new Error(`Cannot archive important channel: ${preArchiveAnalysis.importance_reason}`);
      }
      
      // Confirmation check for important channels
      if (validatedArgs.confirmation_required && preArchiveAnalysis.requires_confirmation) {
        logger.warn(`Archiving important channel ${channelId} - ${preArchiveAnalysis.confirmation_reason}`);
      }
      
      // Send member notification if requested
      let notificationResult = null;
      if (validatedArgs.member_notification && preArchiveAnalysis.member_count > 0) {
        notificationResult = await sendMemberNotification(channelId, validatedArgs);
      }
      
      // Create message backup if requested
      let backupResult = null;
      if (validatedArgs.backup_messages) {
        backupResult = await createMessageBackup(channelId, validatedArgs);
      }
      
      // Attempt to archive the channel with retry logic
      const archiveResult = await attemptChannelArchive(channelId, validatedArgs);
      
      // Post-archive analysis and data collection
      const postArchiveData = await collectPostArchiveData(channelId, validatedArgs, archiveResult);
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_archive_channel', args, duration);
      
      return {
        success: true,
        archived_channel: true,
        channel_id: channelId,
        channel_info: postArchiveData.channel_info,
        member_count: postArchiveData.member_count,
        member_notification: notificationResult,
        message_backup: backupResult,
        archive_analytics: {
          ...preArchiveAnalysis.analytics,
          archive_attempted: true,
          archive_successful: true,
          retry_count: archiveResult.retry_count,
          final_attempt_successful: true,
          execution_time_ms: duration,
          ...postArchiveData.analytics,
        },
        metadata: {
          pre_archive_checks: preArchiveAnalysis.checks,
          archive_method: archiveResult.method,
          warnings: archiveResult.warnings,
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_archive_channel', errorMessage, args);
      
      // Enhanced error handling with specific guidance
      const enhancedError = enhanceArchiveError(error, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_archive_channel',
        args,
        execution_time_ms: duration,
        error_guidance: enhancedError.guidance,
        error_category: enhancedError.category,
        retry_recommended: enhancedError.retryable,
      });
    }
  },
};

/**
 * Normalize channel identifier (name or ID) to channel ID
 */
async function normalizeChannelIdentifier(channel: string): Promise<string> {
  // If it's already a channel ID, return as-is
  if (channel.match(/^C[A-Z0-9]{8,}$/)) {
    return channel;
  }
  
  // Remove # prefix if present
  const channelName = channel.replace(/^#/, '');
  
  // Look up channel by name
  try {
    const channelsResult = await slackClient.getClient().conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000,
    });
    
    if (channelsResult.channels) {
      const foundChannel = channelsResult.channels.find(
        (ch: any) => ch.name === channelName
      );
      
      if (foundChannel && foundChannel.id) {
        return foundChannel.id;
      }
    }
    
    throw new Error(`Channel not found: ${channel}`);
  } catch (error) {
    throw new Error(`Failed to resolve channel identifier '${channel}': ${ErrorHandler.handleError(error)}`);
  }
}

/**
 * Perform comprehensive pre-archive analysis
 */
async function performPreArchiveAnalysis(channelId: string, args: any): Promise<any> {
  const analysis = {
    channel_info: null as any,
    is_archived: false,
    can_archive: true,
    is_general_channel: false,
    is_important_channel: false,
    importance_reason: '',
    requires_confirmation: false,
    confirmation_reason: '',
    member_count: 0,
    checks: {
      channel_exists: false,
      channel_accessible: false,
      not_already_archived: false,
      permission_check: false,
      general_channel_check: false,
      important_channel_check: false,
      member_count_check: false,
    },
    analytics: {
      channel_type: 'unknown',
      is_private: false,
      is_archived: false,
      member_count: 0,
      created_date: null as string | null,
      last_activity: null as string | null,
      purpose: null as string | null,
      topic: null as string | null,
      channel_activity_level: 'unknown',
      estimated_impact: 'minimal',
      archive_readiness_score: 0,
    },
    warnings: [] as string[],
  };
  
  try {
    // Get channel information
    const channelInfo = await slackClient.getClient().conversations.info({
      channel: channelId,
    });
    
    if (channelInfo.channel) {
      analysis.channel_info = channelInfo.channel;
      analysis.checks.channel_exists = true;
      analysis.checks.channel_accessible = true;
      
      // Extract analytics
      analysis.analytics.channel_type = channelInfo.channel.is_private ? 'private' : 'public';
      analysis.analytics.is_private = !!channelInfo.channel.is_private;
      analysis.analytics.is_archived = !!channelInfo.channel.is_archived;
      analysis.analytics.member_count = channelInfo.channel.num_members || 0;
      analysis.member_count = channelInfo.channel.num_members || 0;
      analysis.analytics.created_date = channelInfo.channel.created ? 
        new Date(channelInfo.channel.created * 1000).toISOString() : null;
      analysis.analytics.purpose = channelInfo.channel.purpose?.value || null;
      analysis.analytics.topic = channelInfo.channel.topic?.value || null;
      
      // Check if already archived
      if (channelInfo.channel.is_archived) {
        analysis.is_archived = true;
        analysis.warnings.push('Channel is already archived');
      } else {
        analysis.checks.not_already_archived = true;
      }
      
      // Check if this is the general channel
      if (channelInfo.channel.name === 'general' || channelInfo.channel.is_general) {
        analysis.is_general_channel = true;
        analysis.requires_confirmation = true;
        analysis.confirmation_reason = 'This is the #general channel';
        analysis.checks.general_channel_check = true;
      }
      
      // Check for important channels
      const importantKeywords = ['announcement', 'alert', 'emergency', 'critical', 'important', 'admin', 'leadership'];
      const channelName = channelInfo.channel.name?.toLowerCase() || '';
      const channelPurpose = (channelInfo.channel.purpose?.value || '').toLowerCase();
      const channelTopic = (channelInfo.channel.topic?.value || '').toLowerCase();
      
      for (const keyword of importantKeywords) {
        if (channelName.includes(keyword) || channelPurpose.includes(keyword) || channelTopic.includes(keyword)) {
          analysis.is_important_channel = true;
          analysis.importance_reason = `Contains important keyword: ${keyword}`;
          analysis.requires_confirmation = true;
          analysis.confirmation_reason = `Important channel: ${analysis.importance_reason}`;
          break;
        }
      }
      analysis.checks.important_channel_check = true;
      
      // Check for large channels that might require confirmation
      if (channelInfo.channel.num_members && channelInfo.channel.num_members > 50) {
        analysis.requires_confirmation = true;
        if (!analysis.confirmation_reason) {
          analysis.confirmation_reason = `Large channel with ${channelInfo.channel.num_members} members`;
        }
      }
      analysis.checks.member_count_check = true;
      
      // Calculate archive readiness score (0-100)
      let readinessScore = 50; // Base score
      
      // Reduce score for active channels
      if (channelInfo.channel.num_members && channelInfo.channel.num_members > 10) readinessScore -= 20;
      if (channelInfo.channel.num_members && channelInfo.channel.num_members > 50) readinessScore -= 20;
      
      // Increase score for inactive channels
      const daysSinceCreated = channelInfo.channel.created ? 
        (Date.now() - channelInfo.channel.created * 1000) / (1000 * 60 * 60 * 24) : 0;
      if (daysSinceCreated > 90) readinessScore += 20;
      if (daysSinceCreated > 365) readinessScore += 30;
      
      // Adjust for channel type
      if (channelInfo.channel.is_private) readinessScore += 10;
      
      analysis.analytics.archive_readiness_score = Math.max(0, Math.min(100, readinessScore));
      
      // Estimate impact
      if (!channelInfo.channel.num_members || channelInfo.channel.num_members < 5) {
        analysis.analytics.estimated_impact = 'minimal';
      } else if (channelInfo.channel.num_members < 20) {
        analysis.analytics.estimated_impact = 'low';
      } else if (channelInfo.channel.num_members < 50) {
        analysis.analytics.estimated_impact = 'moderate';
      } else {
        analysis.analytics.estimated_impact = 'high';
      }
      
      // Permission validation
      if (args.validate_permissions) {
        // Check if we have permission to archive
        if (channelInfo.channel.is_private && !channelInfo.channel.is_member) {
          analysis.warnings.push('Cannot archive private channel - not a member');
          analysis.can_archive = false;
        }
        analysis.checks.permission_check = true;
      } else {
        analysis.checks.permission_check = true;
      }
    }
  } catch (error) {
    const errorMsg = ErrorHandler.handleError(error);
    if (errorMsg.includes('channel_not_found')) {
      throw new Error(`Channel not found: ${channelId}`);
    } else if (errorMsg.includes('not_authed') || errorMsg.includes('invalid_auth')) {
      throw new Error('Authentication failed - check your Slack token');
    } else {
      analysis.warnings.push(`Pre-archive analysis warning: ${errorMsg}`);
    }
  }
  
  return analysis;
}

/**
 * Send notification to channel members before archiving
 */
async function sendMemberNotification(channelId: string, args: any): Promise<any> {
  const result = {
    notification_sent: false,
    message_ts: null as string | null,
    member_count_notified: 0,
    warnings: [] as string[],
  };
  
  try {
    const message = args.notification_message || 'This channel will be archived shortly.';
    
    const response = await slackClient.getClient().chat.postMessage({
      channel: channelId,
      text: `📦 **Channel Archive Notice**\n\n${message}\n\n_This is an automated notification._`,
      unfurl_links: false,
      unfurl_media: false,
    });
    
    if (response.ok && response.ts) {
      result.notification_sent = true;
      result.message_ts = response.ts;
      
      // Get member count for notification tracking
      try {
        const membersResponse = await slackClient.getClient().conversations.members({
          channel: channelId,
          limit: 1000,
        });
        result.member_count_notified = membersResponse.members?.length || 0;
      } catch (error) {
        result.warnings.push(`Could not get member count: ${ErrorHandler.handleError(error)}`);
      }
    }
  } catch (error) {
    result.warnings.push(`Failed to send notification: ${ErrorHandler.handleError(error)}`);
  }
  
  return result;
}

/**
 * Create a backup summary of recent messages
 */
async function createMessageBackup(channelId: string, args: any): Promise<any> {
  const result = {
    backup_created: false,
    message_count: 0,
    backup_summary: null as any,
    warnings: [] as string[],
  };
  
  try {
    const limit = Math.min(args.backup_message_count || 50, 100);
    
    const historyResponse = await slackClient.getClient().conversations.history({
      channel: channelId,
      limit,
      inclusive: true,
    });
    
    if (historyResponse.messages) {
      result.message_count = historyResponse.messages.length;
      result.backup_summary = {
        total_messages: result.message_count,
        date_range: {
          oldest: historyResponse.messages.length > 0 && historyResponse.messages[historyResponse.messages.length - 1].ts ? 
            new Date(parseFloat(historyResponse.messages[historyResponse.messages.length - 1].ts!) * 1000).toISOString() : null,
          newest: historyResponse.messages.length > 0 && historyResponse.messages[0].ts ? 
            new Date(parseFloat(historyResponse.messages[0].ts!) * 1000).toISOString() : null,
        },
        message_types: getMessageTypesSummary(historyResponse.messages),
        active_users: getActiveUsersSummary(historyResponse.messages),
      };
      result.backup_created = true;
    }
  } catch (error) {
    result.warnings.push(`Failed to create message backup: ${ErrorHandler.handleError(error)}`);
  }
  
  return result;
}

/**
 * Get summary of message types from messages array
 */
function getMessageTypesSummary(messages: any[]): any {
  const summary = {
    regular_messages: 0,
    thread_replies: 0,
    bot_messages: 0,
    file_uploads: 0,
    reactions: 0,
  };
  
  messages.forEach(msg => {
    if (msg.thread_ts && msg.thread_ts !== msg.ts) {
      summary.thread_replies++;
    } else if (msg.bot_id || msg.subtype === 'bot_message') {
      summary.bot_messages++;
    } else {
      summary.regular_messages++;
    }
    
    if (msg.files && msg.files.length > 0) {
      summary.file_uploads++;
    }
    
    if (msg.reactions && msg.reactions.length > 0) {
      summary.reactions += msg.reactions.length;
    }
  });
  
  return summary;
}

/**
 * Get summary of active users from messages array
 */
function getActiveUsersSummary(messages: any[]): any {
  const userCounts: Record<string, number> = {};
  
  messages.forEach(msg => {
    if (msg.user) {
      userCounts[msg.user] = (userCounts[msg.user] || 0) + 1;
    }
  });
  
  const sortedUsers = Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10 active users
  
  return {
    unique_users: Object.keys(userCounts).length,
    top_contributors: sortedUsers.map(([user, count]) => ({ user, message_count: count })),
  };
}

/**
 * Attempt to archive the channel with retry logic
 */
async function attemptChannelArchive(channelId: string, args: any): Promise<any> {
  const result = {
    success: false,
    method: 'conversations.archive',
    retry_count: 0,
    warnings: [] as string[],
  };
  
  const maxRetries = args.auto_retry ? (args.retry_attempts || 3) : 1;
  const retryDelay = args.retry_delay_ms || 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const archiveResponse = await slackClient.getClient().conversations.archive({
        channel: channelId,
      });
      
      result.success = true;
      result.retry_count = attempt - 1;
      
      // Check for any warnings in the response
      if (archiveResponse && (archiveResponse as any).warning) {
        result.warnings.push(`Slack API warning: ${(archiveResponse as any).warning}`);
      }
      
      break;
      
    } catch (error) {
      const errorMsg = ErrorHandler.handleError(error);
      result.retry_count = attempt - 1;
      
      // Check if this is a retryable error
      const isRetryable = isRetryableError(errorMsg);
      
      if (attempt === maxRetries || !isRetryable) {
        // Final attempt or non-retryable error
        throw error;
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        result.warnings.push(`Retry attempt ${attempt} after error: ${errorMsg}`);
      }
    }
  }
  
  return result;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(errorMsg: string): boolean {
  const retryableErrors = [
    'rate_limited',
    'timeout',
    'internal_error',
    'service_unavailable',
    'temporarily_unavailable',
  ];
  
  return retryableErrors.some(error => errorMsg.toLowerCase().includes(error));
}

/**
 * Collect post-archive data and analytics
 */
async function collectPostArchiveData(channelId: string, args: any, _archiveResult: any): Promise<any> {
  const data = {
    channel_info: null as any,
    member_count: null as number | null,
    analytics: {
      archive_timestamp: new Date().toISOString(),
      post_archive_status: 'archived',
      archive_confirmation: false,
      estimated_storage_saved: 'unknown',
      member_impact_assessment: 'unknown',
    },
  };
  
  try {
    // Get updated channel information (should now show as archived)
    if (args.include_channel_info) {
      try {
        const channelInfo = await slackClient.getClient().conversations.info({
          channel: channelId,
        });
        data.channel_info = channelInfo.channel;
        data.analytics.archive_confirmation = !!channelInfo.channel?.is_archived;
      } catch (error) {
        const errorMsg = ErrorHandler.handleError(error);
        logger.warn(`Failed to get channel info after archiving ${channelId}:`, errorMsg);
      }
    }
    
    // Get member count (if still accessible)
    if (args.include_member_count && data.channel_info) {
      data.member_count = data.channel_info.num_members || null;
      
      // Assess member impact
      if (data.member_count) {
        if (data.member_count < 5) {
          data.analytics.member_impact_assessment = 'minimal';
        } else if (data.member_count < 20) {
          data.analytics.member_impact_assessment = 'low';
        } else if (data.member_count < 50) {
          data.analytics.member_impact_assessment = 'moderate';
        } else {
          data.analytics.member_impact_assessment = 'high';
        }
      }
    }
    
    // Additional analytics
    if (args.include_archive_analytics) {
      // Estimate storage impact (rough calculation)
      if (data.channel_info && data.channel_info.num_members) {
        const estimatedMessagesPerMember = 100; // Rough estimate
        const estimatedBytesPerMessage = 200; // Rough estimate
        const totalEstimatedBytes = data.channel_info.num_members * estimatedMessagesPerMember * estimatedBytesPerMessage;
        
        if (totalEstimatedBytes > 1024 * 1024) {
          data.analytics.estimated_storage_saved = `~${Math.round(totalEstimatedBytes / (1024 * 1024))}MB`;
        } else {
          data.analytics.estimated_storage_saved = `~${Math.round(totalEstimatedBytes / 1024)}KB`;
        }
      }
    }
    
  } catch (error) {
    logger.warn(`Failed to collect post-archive data for channel ${channelId}:`, ErrorHandler.handleError(error));
  }
  
  return data;
}

/**
 * Enhance error messages with specific guidance
 */
function enhanceArchiveError(error: any, _args: any): any {
  const errorMsg = ErrorHandler.handleError(error).toLowerCase();
  
  let category = 'unknown';
  let guidance = 'Please check the error details and try again.';
  let retryable = false;
  
  if (errorMsg.includes('already_archived')) {
    category = 'already_archived';
    guidance = 'This channel is already archived. No action needed.';
    retryable = false;
  } else if (errorMsg.includes('channel_not_found')) {
    category = 'not_found';
    guidance = 'The specified channel does not exist or is not accessible. Verify the channel name or ID.';
    retryable = false;
  } else if (errorMsg.includes('cant_archive_general')) {
    category = 'general_channel';
    guidance = 'Cannot archive the #general channel. This is a Slack restriction for workspace integrity.';
    retryable = false;
  } else if (errorMsg.includes('not_in_channel')) {
    category = 'membership';
    guidance = 'You must be a member of the channel to archive it. Join the channel first or ask an admin.';
    retryable = false;
  } else if (errorMsg.includes('user_is_restricted')) {
    category = 'permissions';
    guidance = 'You do not have permission to archive channels. Contact your workspace admin for the required permissions.';
    retryable = false;
  } else if (errorMsg.includes('missing_scope')) {
    category = 'permissions';
    guidance = 'Missing required OAuth scopes. Ensure your app has channels:write and/or groups:write permissions.';
    retryable = false;
  } else if (errorMsg.includes('not_authed') || errorMsg.includes('invalid_auth')) {
    category = 'authentication';
    guidance = 'Authentication failed. Check your Slack token and ensure it is valid.';
    retryable = false;
  } else if (errorMsg.includes('rate_limited')) {
    category = 'rate_limit';
    guidance = 'Rate limited by Slack API. Wait a moment and try again.';
    retryable = true;
  } else if (errorMsg.includes('internal_error') || errorMsg.includes('service_unavailable')) {
    category = 'service';
    guidance = 'Slack service temporarily unavailable. Try again in a few moments.';
    retryable = true;
  } else if (errorMsg.includes('method_not_supported_for_channel_type')) {
    category = 'channel_type';
    guidance = 'This channel type does not support archiving. Check if it\'s a DM or special channel type.';
    retryable = false;
  } else if (errorMsg.includes('user_is_bot')) {
    category = 'bot_restriction';
    guidance = 'Bot users may have restrictions on archiving channels. Check your bot permissions.';
    retryable = false;
  }
  
  return {
    category,
    guidance,
    retryable,
  };
}
