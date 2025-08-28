/**
 * Enhanced input validation utilities
 */

import { ValidationError } from './error';

export class InputValidator {
  /**
   * Validate Slack user ID format
   */
  static validateUserId(userId: string, fieldName: string = 'user'): void {
    if (!userId) {
      throw new ValidationError(fieldName, 'User ID is required');
    }
    
    if (typeof userId !== 'string') {
      throw new ValidationError(fieldName, 'User ID must be a string');
    }
    
    // Slack user IDs start with 'U' followed by alphanumeric characters
    if (!userId.match(/^U[A-Z0-9]{8,}$/)) {
      throw new ValidationError(fieldName, 'Invalid user ID format. Must start with "U" followed by alphanumeric characters');
    }
  }

  /**
   * Validate Slack channel ID format
   */
  static validateChannelId(channelId: string, fieldName: string = 'channel'): void {
    if (!channelId) {
      throw new ValidationError(fieldName, 'Channel ID is required');
    }
    
    if (typeof channelId !== 'string') {
      throw new ValidationError(fieldName, 'Channel ID must be a string');
    }
    
    // Slack channel IDs start with 'C' (public), 'G' (private), or 'D' (DM)
    if (!channelId.match(/^[CGD][A-Z0-9]{8,}$/)) {
      throw new ValidationError(fieldName, 'Invalid channel ID format. Must start with "C", "G", or "D" followed by alphanumeric characters');
    }
  }

  /**
   * Validate message timestamp format
   */
  static validateTimestamp(timestamp: string, fieldName: string = 'timestamp'): void {
    if (!timestamp) {
      throw new ValidationError(fieldName, 'Timestamp is required');
    }
    
    if (typeof timestamp !== 'string') {
      throw new ValidationError(fieldName, 'Timestamp must be a string');
    }
    
    // Slack timestamps are in format: 1234567890.123456
    if (!timestamp.match(/^\d{10}\.\d{6}$/)) {
      throw new ValidationError(fieldName, 'Invalid timestamp format. Must be in format "1234567890.123456"');
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string, fieldName: string = 'email'): void {
    if (!email) {
      throw new ValidationError(fieldName, 'Email is required');
    }
    
    if (typeof email !== 'string') {
      throw new ValidationError(fieldName, 'Email must be a string');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(fieldName, 'Invalid email format');
    }
  }

  /**
   * Validate channel name format (for #channel references)
   */
  static validateChannelName(channelName: string, fieldName: string = 'channel'): void {
    if (!channelName) {
      throw new ValidationError(fieldName, 'Channel name is required');
    }
    
    if (typeof channelName !== 'string') {
      throw new ValidationError(fieldName, 'Channel name must be a string');
    }
    
    // Remove # prefix if present
    const name = channelName.startsWith('#') ? channelName.slice(1) : channelName;
    
    // Slack channel names: lowercase, no spaces, limited special chars
    if (!name.match(/^[a-z0-9\-_]{1,21}$/)) {
      throw new ValidationError(fieldName, 'Invalid channel name. Must be lowercase, 1-21 characters, and contain only letters, numbers, hyphens, and underscores');
    }
  }

  /**
   * Validate array of user IDs
   */
  static validateUserIds(userIds: string[], fieldName: string = 'users'): void {
    if (!Array.isArray(userIds)) {
      throw new ValidationError(fieldName, 'Must be an array of user IDs');
    }
    
    if (userIds.length === 0) {
      throw new ValidationError(fieldName, 'At least one user ID is required');
    }
    
    userIds.forEach((userId, index) => {
      try {
        this.validateUserId(userId, `${fieldName}[${index}]`);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(fieldName, `Invalid user ID at index ${index}: ${error.message}`);
        }
        throw error;
      }
    });
  }

  /**
   * Sanitize and validate text input
   */
  static validateText(text: string, maxLength: number = 4000, fieldName: string = 'text'): string {
    if (text === null || text === undefined) {
      throw new ValidationError(fieldName, 'Text is required');
    }
    
    if (typeof text !== 'string') {
      throw new ValidationError(fieldName, 'Text must be a string');
    }
    
    // Trim whitespace
    const sanitized = text.trim();
    
    if (sanitized.length === 0) {
      throw new ValidationError(fieldName, 'Text cannot be empty');
    }
    
    if (sanitized.length > maxLength) {
      throw new ValidationError(fieldName, `Text is too long. Maximum ${maxLength} characters allowed`);
    }
    
    return sanitized;
  }
}
