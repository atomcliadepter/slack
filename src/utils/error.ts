import type { WebAPIHTTPError, WebAPIPlatformError } from '@slack/web-api';
import { logger } from '@/utils/logger';

/**
 * Custom error classes for Slack operations
 */
export class SlackError extends Error {
  public code: string;
  public data?: any;

  constructor(code: string, message: string, data?: any) {
    super(message);
    this.name = 'SlackError';
    this.code = code;
    this.data = data;
    Error.captureStackTrace(this, SlackError);
  }
}

export class ValidationError extends SlackError {
  public field: string;
  public value?: any;

  constructor(field: string, message: string, value?: any) {
    super('validation_error', message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    Error.captureStackTrace(this, ValidationError);
  }
}

export class RateLimitError extends SlackError {
  public retryAfter: number;

  constructor(message: string, retryAfter: number = 60) {
    super('rate_limited', message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Error.captureStackTrace(this, RateLimitError);
  }
}

/**
 * Handle Slack API errors and convert to appropriate error types
 */
export function handleSlackError(response: any, headers?: Record<string, string>): SlackError | RateLimitError {
  if (response.error === 'rate_limited') {
    const retryAfter = headers?.['retry-after'] ? parseInt(headers['retry-after']) : 60;
    return new RateLimitError('Rate limit exceeded', retryAfter);
  }
  
  // Map common error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'channel_not_found': 'Channel not found',
    'user_not_found': 'User not found',
    'invalid_auth': 'Invalid authentication token',
    'account_inactive': 'Account is inactive',
    'token_revoked': 'Token has been revoked',
    'no_permission': 'Insufficient permissions',
    'file_not_found': 'File not found',
    'unknown_error': 'Something went wrong'
  };
  
  const errorCode = response.error || 'unknown_error';
  const errorMessage = errorMessages[errorCode] || errorCode;
  
  return new SlackError(errorCode, errorMessage);
}

/**
 * Format errors for user display
 */
export function formatErrorForUser(error: Error): string {
  if (error instanceof ValidationError) {
    return `Validation Error: ${error.message} (Field: ${error.field})`;
  }
  
  if (error instanceof RateLimitError) {
    return `Rate Limited: ${error.message}. Please try again in ${error.retryAfter} seconds.`;
  }
  
  if (error instanceof SlackError) {
    return `Slack API Error: ${error.message} (Error Code: ${error.code})`;
  }
  
  return error.message || 'An unknown error occurred';
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  
  if (error instanceof SlackError) {
    const retryableCodes = ['internal_error', 'service_unavailable', 'timeout'];
    return retryableCodes.includes(error.code);
  }
  
  // Network errors are generally retryable
  if (error.message.toLowerCase().includes('network')) {
    return true;
  }
  
  return false;
}

/**
 * Get retry delay for an error
 */
export function getRetryDelay(attempt: number, error?: Error): number {
  if (error instanceof RateLimitError) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}

/**
 * Aggregate multiple errors into a single error
 */
export function aggregateErrors(errors: Error[]): Error | null {
  if (errors.length === 0) {
    return null;
  }
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  const message = `Multiple errors occurred: ${errors.map(e => e.message).join('; ')}`;
  return new SlackError('multiple_errors', message, { errors });
}

/**
 * Get recovery suggestions for common errors
 */
export function getRecoverySuggestions(errorCode: string | null): string[] {
  const suggestions: Record<string, string[]> = {
    'channel_not_found': [
      'Verify the channel ID or name',
      'Check if the channel exists',
      'Ensure the bot has access to the channel'
    ],
    'invalid_auth': [
      'Check your Slack token',
      'Verify token permissions',
      'Ensure the token is not expired'
    ],
    'rate_limited': [
      'Wait before retrying',
      'Implement exponential backoff',
      'Reduce request frequency'
    ]
  };
  
  return suggestions[errorCode || 'unknown'] || [
    'Check your network connection',
    'Verify your Slack token',
    'Try again later'
  ];
}

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
    });

    return message;
  }

  /**
   * Handle Slack platform errors
   */
  private static handleSlackPlatformError(error: WebAPIPlatformError): string {
    const errorCode = error.data?.error || 'unknown_error';
    const message = `Slack API Error: ${errorCode}`;
    
    logger.error('Slack Platform Error', {
      error: errorCode,
      data: error.data,
    });

    return message;
  }

  /**
   * Handle generic JavaScript errors
   */
  static handleGenericError(error: Error): string {
    logger.error(error.message, error);
    return error.message;
  }

  /**
   * Handle unknown error types
   */
  private static handleUnknownError(error: unknown): string {
    const message = 'An unknown error occurred';
    logger.error(message, { error });
    return message;
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(error: unknown, metadata?: Record<string, any>): any {
    const errorMessage = this.handleError(error);
    
    return {
      success: false,
      error: errorMessage,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }
}
