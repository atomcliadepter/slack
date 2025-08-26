
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Join Channel Tool
 * Comprehensive channel joining with validation, permission checking, and analytics
 */
export const slackJoinChannelTool: MCPTool = {
  name: 'slack_join_channel',
  description: 'Join a Slack channel with advanced validation, permission checking, and join analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or channel name (#general) to join',
        pattern: '^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$',
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
      const validatedArgs = Validator.validate(ToolSchemas.joinChannel, args);
      
      // Normalize channel identifier
      const channelId = await normalizeChannelIdentifier(validatedArgs.channel);
      
      // Pre-join validation and checks
      const preJoinAnalysis = await performPreJoinAnalysis(channelId, validatedArgs);
      
      // If already a member and check_membership is enabled, return early
      if (validatedArgs.check_membership && preJoinAnalysis.already_member) {
        const duration = Date.now() - startTime;
        logger.logToolExecution('slack_join_channel', args, duration);
        
        return {
          success: true,
          already_member: true,
          channel_id: channelId,
          channel_info: preJoinAnalysis.channel_info,
          message: 'Already a member of this channel',
          join_analytics: {
            ...preJoinAnalysis.analytics,
            join_attempted: false,
            join_successful: false,
            already_member: true,
            execution_time_ms: duration,
          },
          metadata: {
            pre_join_checks: preJoinAnalysis.checks,
            execution_time_ms: duration,
          },
        };
      }
      
      // Attempt to join the channel with retry logic
      const joinResult = await attemptChannelJoin(channelId, validatedArgs);
      
      // Post-join analysis and data collection
      const postJoinData = await collectPostJoinData(channelId, validatedArgs, joinResult);
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_join_channel', args, duration);
      
      return {
        success: true,
        already_member: joinResult.was_already_member,
        channel_id: channelId,
        channel_info: postJoinData.channel_info,
        member_count: postJoinData.member_count,
        join_analytics: {
          ...preJoinAnalysis.analytics,
          join_attempted: true,
          join_successful: true,
          already_member: joinResult.was_already_member,
          retry_count: joinResult.retry_count,
          final_attempt_successful: true,
          execution_time_ms: duration,
          ...postJoinData.analytics,
        },
        metadata: {
          pre_join_checks: preJoinAnalysis.checks,
          join_method: joinResult.method,
          warnings: joinResult.warnings,
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_join_channel', errorMessage, args);
      
      // Enhanced error handling with specific guidance
      const enhancedError = enhanceJoinError(error, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_join_channel',
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
 * Perform comprehensive pre-join analysis
 */
async function performPreJoinAnalysis(channelId: string, args: any): Promise<any> {
  const analysis = {
    channel_info: null as any,
    already_member: false,
    can_join: true,
    checks: {
      channel_exists: false,
      channel_accessible: false,
      not_archived: false,
      permission_check: false,
      membership_check: false,
    },
    analytics: {
      channel_type: 'unknown',
      is_private: false,
      is_archived: false,
      member_count_estimate: 0,
      created_date: null as string | null,
      purpose: null as string | null,
      topic: null as string | null,
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
        analysis.can_join = false;
        analysis.warnings.push('Channel is archived and cannot be joined');
        throw new Error('Cannot join archived channel');
      } else {
        analysis.checks.not_archived = true;
      }
      
      // Check membership if requested
      if (args.check_membership) {
        analysis.already_member = !!channelInfo.channel.is_member;
        analysis.checks.membership_check = true;
      }
      
      // Permission validation for private channels
      if (args.validate_permissions && channelInfo.channel.is_private) {
        // For private channels, we can only join if we're invited or are the creator
        // This is a limitation check rather than a permission check
        if (!channelInfo.channel.is_member) {
          analysis.warnings.push('Private channels require invitation to join');
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
      analysis.warnings.push(`Pre-join analysis warning: ${errorMsg}`);
    }
  }
  
  return analysis;
}

/**
 * Attempt to join the channel with retry logic
 */
async function attemptChannelJoin(channelId: string, args: any): Promise<any> {
  const result = {
    success: false,
    was_already_member: false,
    method: 'conversations.join',
    retry_count: 0,
    warnings: [] as string[],
  };
  
  const maxRetries = args.auto_retry ? (args.retry_attempts || 3) : 1;
  const retryDelay = args.retry_delay_ms || 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const joinResponse = await slackClient.getClient().conversations.join({
        channel: channelId,
      });
      
      result.success = true;
      result.retry_count = attempt - 1;
      
      // Check for warnings (like already_in_channel)
      if (joinResponse && joinResponse.warning === 'already_in_channel') {
        result.was_already_member = true;
        result.warnings.push('Was already a member of the channel');
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
 * Collect post-join data and analytics
 */
async function collectPostJoinData(channelId: string, args: any, _joinResult: any): Promise<any> {
  const data = {
    channel_info: null as any,
    member_count: null as number | null,
    analytics: {
      join_timestamp: new Date().toISOString(),
      post_join_member_count: null as number | null,
      user_position_in_channel: null as number | null,
      channel_activity_level: 'unknown',
    },
  };
  
  try {
    // Get updated channel information
    if (args.include_channel_info) {
      const channelInfo = await slackClient.getClient().conversations.info({
        channel: channelId,
      });
      data.channel_info = channelInfo.channel;
    }
    
    // Get member count
    if (args.include_member_count) {
      try {
        await slackClient.getClient().conversations.members({
          channel: channelId,
          limit: 1, // We just want the count
        });
        
        // Get total count from response metadata or estimate
        data.member_count = data.channel_info?.num_members || null;
        data.analytics.post_join_member_count = data.member_count;
      } catch (error) {
        logger.warn(`Failed to get member count for channel ${channelId}:`, ErrorHandler.handleError(error));
      }
    }
    
    // Additional analytics
    if (args.include_join_analytics) {
      // Estimate channel activity level based on recent messages
      try {
        const historyResult = await slackClient.getClient().conversations.history({
          channel: channelId,
          limit: 10,
        });
        
        if (historyResult.messages && historyResult.messages.length > 0) {
          const recentMessages = historyResult.messages.filter((msg: any) => {
            const msgTime = new Date(parseFloat(msg.ts) * 1000);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return msgTime > dayAgo;
          });
          
          if (recentMessages.length >= 5) {
            data.analytics.channel_activity_level = 'high';
          } else if (recentMessages.length >= 2) {
            data.analytics.channel_activity_level = 'medium';
          } else if (recentMessages.length >= 1) {
            data.analytics.channel_activity_level = 'low';
          } else {
            data.analytics.channel_activity_level = 'inactive';
          }
        }
      } catch (error) {
        // Not critical, just log the warning
        logger.warn(`Failed to analyze channel activity for ${channelId}:`, ErrorHandler.handleError(error));
      }
    }
    
  } catch (error) {
    logger.warn(`Failed to collect post-join data for channel ${channelId}:`, ErrorHandler.handleError(error));
  }
  
  return data;
}

/**
 * Enhance error messages with specific guidance
 */
function enhanceJoinError(error: any, _args: any): any {
  const errorMsg = ErrorHandler.handleError(error).toLowerCase();
  
  let category = 'unknown';
  let guidance = 'Please check the error details and try again.';
  let retryable = false;
  
  if (errorMsg.includes('already_in_channel')) {
    category = 'membership';
    guidance = 'You are already a member of this channel. No action needed.';
    retryable = false;
  } else if (errorMsg.includes('channel_not_found')) {
    category = 'not_found';
    guidance = 'The specified channel does not exist or is not accessible. Verify the channel name or ID.';
    retryable = false;
  } else if (errorMsg.includes('is_archived')) {
    category = 'archived';
    guidance = 'Cannot join an archived channel. The channel must be unarchived first.';
    retryable = false;
  } else if (errorMsg.includes('method_not_supported_for_channel_type')) {
    category = 'private_channel';
    guidance = 'Cannot join private channels directly. You must be invited by a channel member or admin.';
    retryable = false;
  } else if (errorMsg.includes('missing_scope')) {
    category = 'permissions';
    guidance = 'Missing required OAuth scopes. Ensure your app has channels:join and/or groups:write permissions.';
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
  }
  
  return {
    category,
    guidance,
    retryable,
  };
}
