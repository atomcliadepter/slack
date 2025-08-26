
import type { WebAPIHTTPError, WebAPIPlatformError } from '@slack/web-api';
import { logger } from '@/utils/logger';

/**
 * Enhanced error handling for Slack API and general errors
 */
export class ErrorHandler {
  /**
   * Handle and format errors consistently
   */
  static handleError(error: unknown): string {
    if (this.isWebAPIHTTPError(error)) {
      return this.handleSlackHTTPError(error);
    }

    if (this.isWebAPIPlatformError(error)) {
      return this.handleSlackPlatformError(error);
    }

    if (error instanceof Error) {
      return this.handleGenericError(error);
    }

    return this.handleUnknownError(error);
  }

  /**
   * Type guard for WebAPIHTTPError
   */
  private static isWebAPIHTTPError(error: unknown): error is WebAPIHTTPError {
    return error != null && typeof error === 'object' && 'statusCode' in error;
  }

  /**
   * Type guard for WebAPIPlatformError
   */
  private static isWebAPIPlatformError(error: unknown): error is WebAPIPlatformError {
    return error != null && typeof error === 'object' && 'data' in error && typeof (error as any).data === 'object';
  }

  /**
   * Handle Slack HTTP errors
   */
  private static handleSlackHTTPError(error: WebAPIHTTPError): string {
    const message = `Slack HTTP Error (${error.statusCode}): ${error.message}`;
    
    logger.error('Slack HTTP Error', {
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      message: error.message,
      headers: error.headers,
    });

    // Provide user-friendly messages for common errors
    switch (error.statusCode) {
      case 401:
        return 'Authentication failed. Please check your Slack bot token.';
      case 403:
        return 'Permission denied. The bot may not have the required permissions.';
      case 404:
        return 'Resource not found. Please check the channel or user ID.';
      case 429:
        return 'Rate limit exceeded. Please try again later.';
      default:
        return message;
    }
  }

  /**
   * Handle Slack platform errors
   */
  private static handleSlackPlatformError(error: WebAPIPlatformError): string {
    const message = `Slack Platform Error: ${error.data.error}`;
    
    logger.error('Slack Platform Error', {
      error: error.data.error,
      data: error.data,
    });

    // Provide user-friendly messages for common platform errors
    switch (error.data.error) {
      case 'channel_not_found':
        return 'Channel not found. Please check the channel name or ID.';
      case 'user_not_found':
        return 'User not found. Please check the username or user ID.';
      case 'not_in_channel':
        return 'Bot is not a member of this channel. Please invite the bot first.';
      case 'invalid_auth':
        return 'Invalid authentication token. Please check your bot token.';
      case 'missing_scope':
        return 'Missing required OAuth scope. Please check bot permissions.';
      case 'file_not_found':
        return 'File not found. Please check the file ID.';
      case 'too_long':
        return 'Message is too long. Please shorten your message.';
      default:
        return message;
    }
  }

  /**
   * Handle generic JavaScript errors
   */
  private static handleGenericError(error: Error): string {
    logger.error('Generic Error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    return error.message || 'An unexpected error occurred';
  }

  /**
   * Handle unknown error types
   */
  private static handleUnknownError(error: unknown): string {
    const message = 'An unknown error occurred';
    
    logger.error('Unknown Error', {
      error: String(error),
      type: typeof error,
    });

    return message;
  }

  /**
   * Create a standardized error response
   */
  static createErrorResponse(error: unknown, context?: Record<string, any>) {
    const errorMessage = this.handleError(error);
    
    return {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  /**
   * Validate required parameters
   */
  static validateRequired(params: Record<string, any>, required: string[]): void {
    const missing = required.filter(key => !params[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Wrap async functions with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    _context?: Record<string, any>
  ): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: this.handleError(error)
      };
    }
  }
}

/**
 * Custom error classes for specific scenarios
 */
export class SlackConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlackConfigurationError';
  }
}

export class SlackPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlackPermissionError';
  }
}

export class SlackRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlackRateLimitError';
  }
}
