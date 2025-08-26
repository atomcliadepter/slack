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

export class ValidationError extends Error {
  public field: string;
  public value?: any;

  constructor(field: string, message: string, value?: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    Error.captureStackTrace(this, ValidationError);
  }
}

export class RateLimitError extends Error {
  public retryAfter: number;

  constructor(message: string, retryAfter: number = 60) {
    super(message);
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
    return new RateLimitError(response.error, retryAfter);
  }
  
  return new SlackError(response.error || 'unknown_error', response.error || 'An unknown error occurred');
}

/**
 * Format errors for user display
 */
export function formatErrorForUser(error: Error): string {
  if (error instanceof SlackError) {
    return `Slack API Error: ${error.message} (${error.code})`;
  }
  
  if (error instanceof ValidationError) {
    return `Validation Error: ${error.message} (field: ${error.field})`;
  }
  
  if (error instanceof RateLimitError) {
    return `Rate Limited: ${error.message}. Please retry after ${error.retryAfter} seconds.`;
  }
  
  return error.message || 'An unknown error occurred';
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof SlackError) {
    const retryableCodes = ['internal_error', 'service_unavailable', 'timeout'];
    return retryableCodes.includes(error.code);
  }
  return false;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attempt: number, error?: Error): number {
  if (error instanceof RateLimitError) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }
  
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  return delay;
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
 * Aggregate multiple errors into a single error
 */
export function aggregateErrors(errors: Error[]): Error | null {
  if (errors.length === 0) return null;
  if (errors.length === 1) return errors[0];
  
  const messages = errors.map(e => e.message).join('; ');
  return new Error(`Multiple errors occurred: ${messages}`);
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
