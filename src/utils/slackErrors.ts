/**
 * Enhanced Slack API error handling
 */

import { SlackError } from './error';

export interface SlackAPIError {
  error: string;
  ok: false;
  response_metadata?: {
    messages?: string[];
  };
}

/**
 * Map of Slack error codes to user-friendly messages
 */
const SLACK_ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'invalid_auth': 'Invalid authentication token. Please check your SLACK_BOT_TOKEN.',
  'account_inactive': 'Slack account is inactive. Please reactivate your account.',
  'token_revoked': 'Authentication token has been revoked. Please generate a new token.',
  'no_permission': 'Insufficient permissions. Please check your bot token scopes.',
  
  // Channel errors
  'channel_not_found': 'Channel not found. Please check the channel ID or name.',
  'not_in_channel': 'Bot is not a member of this channel. Please invite the bot first.',
  'is_archived': 'Cannot perform action on archived channel.',
  'channel_not_im': 'This operation requires a direct message channel.',
  'already_in_channel': 'User is already a member of this channel.',
  
  // User errors
  'user_not_found': 'User not found. Please check the user ID or username.',
  'users_not_found': 'One or more users not found. Please check user IDs.',
  'user_not_in_channel': 'User is not a member of this channel.',
  'cant_invite_self': 'Cannot invite yourself to a channel.',
  
  // Message errors
  'message_not_found': 'Message not found. It may have been deleted.',
  'cant_update_message': 'Cannot update this message. You may not have permission.',
  'edit_window_closed': 'Message edit window has closed.',
  'too_long': 'Message is too long. Please shorten your message.',
  'msg_too_long': 'Message is too long. Please shorten your message.',
  
  // File errors
  'file_not_found': 'File not found or has been deleted.',
  'file_deleted': 'File has been deleted and cannot be accessed.',
  'over_file_size_limit': 'File is too large. Please use a smaller file.',
  
  // Rate limiting
  'rate_limited': 'API rate limit exceeded. Please wait before making more requests.',
  
  // General errors
  'invalid_arguments': 'Invalid arguments provided. Please check your input.',
  'missing_scope': 'Missing required OAuth scope. Please update your app permissions.',
  'not_allowed': 'This action is not allowed.',
  'compliance_exports_prevent_deletion': 'Cannot delete due to compliance export settings.',
};

/**
 * Enhanced Slack API error handler
 */
export class SlackAPIErrorHandler {
  /**
   * Handle Slack API error response
   */
  static handleSlackAPIError(result: SlackAPIError): SlackError {
    const errorCode = result.error;
    const userMessage = SLACK_ERROR_MESSAGES[errorCode] || `Slack API error: ${errorCode}`;
    
    // Include error code in message for test compatibility
    let fullMessage = `${userMessage} (${errorCode})`;
    if (result.response_metadata?.messages?.length) {
      fullMessage += ` Additional info: ${result.response_metadata.messages.join(', ')}`;
    }
    
    return new SlackError(errorCode, fullMessage, {
      slack_error: errorCode,
      response_metadata: result.response_metadata,
    });
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(errorCode: string): boolean {
    const retryableErrors = [
      'rate_limited',
      'internal_error',
      'fatal_error',
    ];
    return retryableErrors.includes(errorCode);
  }

  /**
   * Get suggested action for error
   */
  static getSuggestedAction(errorCode: string): string {
    const suggestions: Record<string, string> = {
      'invalid_auth': 'Verify your SLACK_BOT_TOKEN in environment variables',
      'no_permission': 'Add required OAuth scopes to your Slack app',
      'channel_not_found': 'Check channel exists and bot has access',
      'not_in_channel': 'Invite bot to channel or use public channel',
      'user_not_found': 'Verify user ID or username is correct',
      'rate_limited': 'Implement exponential backoff and reduce request frequency',
      'missing_scope': 'Update OAuth scopes in your Slack app settings',
    };
    
    return suggestions[errorCode] || 'Check Slack API documentation for more details';
  }

  /**
   * Create enhanced error response
   */
  static createErrorResponse(result: SlackAPIError, context?: Record<string, any>) {
    const slackError = this.handleSlackAPIError(result);
    const suggestion = this.getSuggestedAction(result.error);
    
    return {
      success: false,
      error: slackError.message,
      error_code: slackError.code,
      suggested_action: suggestion,
      is_retryable: this.isRetryableError(result.error),
      context,
      metadata: {
        slack_error_details: slackError.data,
      },
    };
  }
}
