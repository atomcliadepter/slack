
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Leave Channel Tool
 * Comprehensive channel leaving with validation, membership verification, and analytics
 */
export const slackLeaveChannelTool: MCPTool = {
  name: 'slack_leave_channel',
  description: 'Leave a Slack channel with advanced validation, membership verification, and leave analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or channel name (#general) to leave',
        pattern: '^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$',
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
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.leaveChannel, args);
      
      // Normalize channel identifier
      const channelId = await normalizeChannelIdentifier(validatedArgs.channel);
      
      // Pre-leave validation and checks
      const preLeaveAnalysis = await performPreLeaveAnalysis(channelId, validatedArgs);
      
      // If not a member and check_membership is enabled, return early
      if (validatedArgs.check_membership && !preLeaveAnalysis.is_member) {
        const duration = Date.now() - startTime;
        logger.logToolExecution('slack_leave_channel', args, duration);
        
        return {
          success: true,
          not_member: true,
          channel_id: channelId,
          channel_info: preLeaveAnalysis.channel_info,
          message: 'Not a member of this channel',
          leave_analytics: {
            ...preLeaveAnalysis.analytics,
            leave_attempted: false,
            leave_successful: false,
            not_member: true,
            execution_time_ms: duration,
          },
          metadata: {
            pre_leave_checks: preLeaveAnalysis.checks,
            execution_time_ms: duration,
          },
        };
      }
      
      // Check for general channel protection
      if (validatedArgs.prevent_general_leave && preLeaveAnalysis.is_general_channel) {
        throw new Error('Cannot leave #general channel - this is typically not allowed and may cause issues');
      }
      
      // Confirmation check for important channels
      if (validatedArgs.confirmation_required && preLeaveAnalysis.requires_confirmation) {
        logger.warn(`Leaving important channel ${channelId} - ${preLeaveAnalysis.confirmation_reason}`);
      }
      
      // Attempt to leave the channel with retry logic
      const leaveResult = await attemptChannelLeave(channelId, validatedArgs);
      
      // Post-leave analysis and data collection
      const postLeaveData = await collectPostLeaveData(channelId, validatedArgs, leaveResult);
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_leave_channel', args, duration);
      
      return {
        success: true,
        left_channel: true,
        channel_id: channelId,
        channel_info: postLeaveData.channel_info,
        remaining_member_count: postLeaveData.member_count,
        leave_analytics: {
          ...preLeaveAnalysis.analytics,
          leave_attempted: true,
          leave_successful: true,
          retry_count: leaveResult.retry_count,
          final_attempt_successful: true,
          execution_time_ms: duration,
          ...postLeaveData.analytics,
        },
        metadata: {
          pre_leave_checks: preLeaveAnalysis.checks,
          leave_method: leaveResult.method,
          warnings: leaveResult.warnings,
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_leave_channel', errorMessage, args);
      
      // Enhanced error handling with specific guidance
      const enhancedError = enhanceLeaveError(error, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_leave_channel',
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
 * Perform comprehensive pre-leave analysis
 */
async function performPreLeaveAnalysis(channelId: string, args: any): Promise<any> {
  const analysis = {
    channel_info: null as any,
    is_member: false,
    can_leave: true,
    is_general_channel: false,
    requires_confirmation: false,
    confirmation_reason: '',
    checks: {
      channel_exists: false,
      channel_accessible: false,
      not_archived: false,
      permission_check: false,
      membership_check: false,
      general_channel_check: false,
    },
    analytics: {
      channel_type: 'unknown',
      is_private: false,
      is_archived: false,
      member_count_estimate: 0,
      user_join_date: null as string | null,
      created_date: null as string | null,
      purpose: null as string | null,
      topic: null as string | null,
      channel_activity_level: 'unknown',
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
      analysis.analytics.member_count_estimate = channelInfo.channel.num_members || 0;
      analysis.analytics.created_date = channelInfo.channel.created ? 
        new Date(channelInfo.channel.created * 1000).toISOString() : null;
      analysis.analytics.purpose = channelInfo.channel.purpose?.value || null;
      analysis.analytics.topic = channelInfo.channel.topic?.value || null;
      
      // Check if archived
      if (channelInfo.channel.is_archived) {
        analysis.warnings.push('Channel is archived - leaving archived channels may not be necessary');
      } else {
        analysis.checks.not_archived = true;
      }
      
      // Check if this is the general channel
      if (channelInfo.channel.name === 'general' || channelInfo.channel.is_general) {
        analysis.is_general_channel = true;
        analysis.requires_confirmation = true;
        analysis.confirmation_reason = 'This is the #general channel';
        analysis.checks.general_channel_check = true;
      }
      
      // Check for large channels that might require confirmation
      if (channelInfo.channel.num_members && channelInfo.channel.num_members > 100) {
        analysis.requires_confirmation = true;
        analysis.confirmation_reason = `Large channel with ${channelInfo.channel.num_members} members`;
      }
      
      // Check membership if requested
      if (args.check_membership) {
        analysis.is_member = !!channelInfo.channel.is_member;
        analysis.checks.membership_check = true;
        
        if (!analysis.is_member) {
          analysis.warnings.push('Not currently a member of this channel');
        }
      }
      
      // Permission validation
      if (args.validate_permissions) {
        // For private channels, check if we have permission to leave
        if (channelInfo.channel.is_private && !channelInfo.channel.is_member) {
          analysis.warnings.push('Cannot leave private channel - not a member');
          analysis.can_leave = false;
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
      analysis.warnings.push(`Pre-leave analysis warning: ${errorMsg}`);
    }
  }
  
  return analysis;
}

/**
 * Attempt to leave the channel with retry logic
 */
async function attemptChannelLeave(channelId: string, args: any): Promise<any> {
  const result = {
    success: false,
    method: 'conversations.leave',
    retry_count: 0,
    warnings: [] as string[],
  };
  
  const maxRetries = args.auto_retry ? (args.retry_attempts || 3) : 1;
  const retryDelay = args.retry_delay_ms || 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const leaveResponse = await slackClient.getClient().conversations.leave({
        channel: channelId,
      });
      
      result.success = true;
      result.retry_count = attempt - 1;
      
      // Check for any warnings in the response
      if (leaveResponse && (leaveResponse as any).warning) {
        result.warnings.push(`Slack API warning: ${(leaveResponse as any).warning}`);
      }
      
      break;
      
    } catch (error: any) {
      const errorMsg = ErrorHandler.handleError(error);
      result.retry_count = attempt - 1;
      
      // Handle specific error cases
      if (error.data?.error === 'not_in_channel') {
        throw new Error('Cannot leave channel: Bot is not a member of this channel. Join the channel first before attempting to leave.');
      }
      
      if (error.data?.error === 'cant_leave_general') {
        throw new Error('Cannot leave the #general channel. This is a Slack restriction.');
      }
      
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
 * Collect post-leave data and analytics
 */
async function collectPostLeaveData(channelId: string, args: any, _leaveResult: any): Promise<any> {
  const data = {
    channel_info: null as any,
    member_count: null as number | null,
    analytics: {
      leave_timestamp: new Date().toISOString(),
      post_leave_member_count: null as number | null,
      channel_activity_level: 'unknown',
      estimated_impact: 'minimal',
    },
  };
  
  try {
    // Get updated channel information (from outside perspective)
    if (args.include_channel_info) {
      try {
        const channelInfo = await slackClient.getClient().conversations.info({
          channel: channelId,
        });
        data.channel_info = channelInfo.channel;
      } catch (error) {
        // Expected to fail since we're no longer a member of private channels
        const errorMsg = ErrorHandler.handleError(error);
        if (errorMsg.includes('not_in_channel') || errorMsg.includes('channel_not_found')) {
          logger.debug(`Cannot access channel info after leaving ${channelId} - this is expected for private channels`);
        } else {
          logger.warn(`Failed to get channel info after leaving ${channelId}:`, errorMsg);
        }
      }
    }
    
    // Get member count (if still accessible)
    if (args.include_member_count && data.channel_info) {
      data.member_count = data.channel_info.num_members || null;
      data.analytics.post_leave_member_count = data.member_count;
      
      // Estimate impact based on channel size
      if (data.member_count && data.member_count < 10) {
        data.analytics.estimated_impact = 'significant';
      } else if (data.member_count && data.member_count < 50) {
        data.analytics.estimated_impact = 'moderate';
      } else {
        data.analytics.estimated_impact = 'minimal';
      }
    }
    
    // Additional analytics
    if (args.include_leave_analytics) {
      // We can't analyze channel activity after leaving, so we'll note this
      data.analytics.channel_activity_level = 'unknown_after_leave';
    }
    
  } catch (error) {
    logger.warn(`Failed to collect post-leave data for channel ${channelId}:`, ErrorHandler.handleError(error));
  }
  
  return data;
}

/**
 * Enhance error messages with specific guidance
 */
function enhanceLeaveError(error: any, _args: any): any {
  const errorMsg = ErrorHandler.handleError(error).toLowerCase();
  
  let category = 'unknown';
  let guidance = 'Please check the error details and try again.';
  let retryable = false;
  
  if (errorMsg.includes('not_in_channel')) {
    category = 'membership';
    guidance = 'You are not a member of this channel. No action needed.';
    retryable = false;
  } else if (errorMsg.includes('channel_not_found')) {
    category = 'not_found';
    guidance = 'The specified channel does not exist or is not accessible. Verify the channel name or ID.';
    retryable = false;
  } else if (errorMsg.includes('cant_leave_general')) {
    category = 'general_channel';
    guidance = 'Cannot leave the #general channel. This is a Slack restriction for workspace integrity.';
    retryable = false;
  } else if (errorMsg.includes('method_not_supported_for_channel_type')) {
    category = 'channel_type';
    guidance = 'This channel type does not support the leave operation. Check if it\'s a DM or special channel type.';
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
  } else if (errorMsg.includes('user_is_bot')) {
    category = 'bot_restriction';
    guidance = 'Bot users may have restrictions on leaving certain channels. Check your bot permissions.';
    retryable = false;
  }
  
  return {
    category,
    guidance,
    retryable,
  };
}
