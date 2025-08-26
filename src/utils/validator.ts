

import { z } from 'zod';

/**
 * Zod schemas for tool validation
 */
export const ToolSchemas = {
  // Existing schemas (keeping them for reference)
  sendMessage: z.object({
    channel: z.string().min(1, 'Channel is required'),
    text: z.string().min(1, 'Message text is required'),
    thread_ts: z.string().optional(),
    reply_broadcast: z.boolean().default(false),
    unfurl_links: z.boolean().default(true),
    unfurl_media: z.boolean().default(true),
    parse: z.enum(['full', 'none']).default('none'),
    link_names: z.boolean().default(false),
    username: z.string().optional(),
    as_user: z.boolean().default(true),
    icon_emoji: z.string().optional(),
    icon_url: z.string().url().optional(),
    blocks: z.array(z.any()).optional(),
    attachments: z.array(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  }),

  getChannelHistory: z.object({
    channel: z.string().min(1, 'Channel is required'),
    latest: z.string().optional(),
    oldest: z.string().optional(),
    inclusive: z.boolean().default(false),
    limit: z.number().int().min(1).max(1000).default(100),
    cursor: z.string().optional(),
    include_all_metadata: z.boolean().default(false),
  }),

  createChannel: z.object({
    name: z.string()
      .min(1, 'Channel name is required')
      .max(80, 'Channel name must be 80 characters or less')
      .regex(/^[a-z0-9_-]+$/, 'Channel name must contain only lowercase letters, numbers, hyphens, and underscores'),
    is_private: z.boolean().default(false),
    topic: z.string().max(250).optional(),
    purpose: z.string().max(250).optional(),
    team_id: z.string().optional(),
  }),

  getUserInfo: z.object({
    user: z.string().min(1, 'User ID is required'),
    include_locale: z.boolean().default(false),
  }),

  uploadFile: z.object({
    channels: z.union([z.string(), z.array(z.string())]).optional(),
    content: z.string().optional(),
    file: z.string().optional(),
    file_path: z.string().optional(),
    filename: z.string().optional(),
    filetype: z.string().optional(),
    initial_comment: z.string().optional(),
    thread_ts: z.string().optional(),
    title: z.string().optional(),
  }),

  searchMessages: z.object({
    query: z.string().min(1, 'Search query is required'),
    count: z.number().int().min(1).max(1000).default(20),
    highlight: z.boolean().default(false),
    page: z.number().int().min(1).default(1),
    sort: z.enum(['score', 'timestamp']).default('score'),
    sort_dir: z.enum(['asc', 'desc']).default('desc'),
  }),

  setStatus: z.object({
    status_text: z.string().max(100).default(''),
    status_emoji: z.string().optional(),
    status_expiration: z.number().int().min(0).optional(),
  }),

  getWorkspaceInfo: z.object({
    // No required parameters for workspace info
  }),

  listChannels: z.object({
    cursor: z.string().optional(),
    exclude_archived: z.boolean().default(true),
    exclude_members: z.boolean().default(false),
    limit: z.number().int().min(1).max(1000).default(100),
    team_id: z.string().optional(),
    types: z.string().default('public_channel'),
    name_filter: z.string().optional(),
    include_member_count: z.boolean().default(true),
    include_purpose_topic: z.boolean().default(true),
    include_analytics: z.boolean().default(true),
    sort_by: z.enum(['name', 'created', 'members', 'activity']).default('name'),
    sort_direction: z.enum(['asc', 'desc']).default('asc'),
  }),

  listUsers: z.object({
    limit: z.number().int().min(1).max(1000).default(100),
    cursor: z.string().optional(),
    team_id: z.string().optional(),
    include_locale: z.boolean().default(false),
    include_deleted: z.boolean().default(false),
    include_bots: z.boolean().default(true),
    include_profile: z.boolean().default(true),
    include_presence: z.boolean().default(false),
    include_analytics: z.boolean().default(true),
    sort_by: z.enum(['name', 'real_name', 'created', 'status']).default('name'),
    sort_direction: z.enum(['asc', 'desc']).default('asc'),
    name_filter: z.string().optional(),
    status_filter: z.enum(['active', 'away', 'dnd', 'offline']).optional(),
  }),

  joinChannel: z.object({
    channel: z.string()
      .min(1, 'Channel is required')
      .regex(/^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$/, 'Invalid channel format. Use channel name (#general) or ID (C1234567890)'),
    validate_permissions: z.boolean().default(true),
    check_membership: z.boolean().default(true),
    include_channel_info: z.boolean().default(true),
    include_member_count: z.boolean().default(true),
    include_join_analytics: z.boolean().default(true),
    auto_retry: z.boolean().default(true),
    retry_attempts: z.number().int().min(1).max(5).default(3),
    retry_delay_ms: z.number().int().min(100).max(10000).default(1000),
  }),

  leaveChannel: z.object({
    channel: z.string()
      .min(1, 'Channel is required')
      .regex(/^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$/, 'Invalid channel format. Use channel name (#general) or ID (C1234567890)'),
    validate_permissions: z.boolean().default(true),
    check_membership: z.boolean().default(true),
    prevent_general_leave: z.boolean().default(true),
    include_channel_info: z.boolean().default(true),
    include_member_count: z.boolean().default(true),
    include_leave_analytics: z.boolean().default(true),
    confirmation_required: z.boolean().default(true),
    auto_retry: z.boolean().default(true),
    retry_attempts: z.number().int().min(1).max(5).default(3),
    retry_delay_ms: z.number().int().min(100).max(10000).default(1000),
  }),

  archiveChannel: z.object({
    channel: z.string()
      .min(1, 'Channel is required')
      .regex(/^(#?[a-z0-9_-]+|C[A-Z0-9]{8,})$/, 'Invalid channel format. Use channel name (#general) or ID (C1234567890)'),
    validate_permissions: z.boolean().default(true),
    check_already_archived: z.boolean().default(true),
    prevent_general_archive: z.boolean().default(true),
    prevent_important_channels: z.boolean().default(true),
    member_notification: z.boolean().default(false),
    notification_message: z.string().default('This channel will be archived shortly.'),
    include_channel_info: z.boolean().default(true),
    include_member_count: z.boolean().default(true),
    include_archive_analytics: z.boolean().default(true),
    confirmation_required: z.boolean().default(true),
    auto_retry: z.boolean().default(true),
    retry_attempts: z.number().int().min(1).max(5).default(3),
    retry_delay_ms: z.number().int().min(100).max(10000).default(1000),
    backup_messages: z.boolean().default(false),
    backup_message_count: z.number().int().min(10).max(100).default(50),
  }),
};

/**
 * Validator utility class
 */
export class Validator {
  /**
   * Validate input against a schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: any): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => {
          const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
          return `${path}${err.message}`;
        });
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Validate and return only valid fields
   */
  static validatePartial<T>(schema: z.ZodObject<any>, data: any): Partial<T> {
    try {
      return schema.partial().parse(data) as Partial<T>;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => {
          const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
          return `${path}${err.message}`;
        });
        throw new Error(`Partial validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Check if data is valid without throwing
   */
  static isValid<T>(schema: z.ZodSchema<T>, data: any): boolean {
    try {
      schema.parse(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate Slack attachments
   */
  static validateAttachments(attachments: any[]): boolean {
    if (!Array.isArray(attachments)) return false;
    
    return attachments.every(attachment => {
      if (typeof attachment !== 'object' || attachment === null) return false;
      
      // Basic attachment validation
      if (attachment.fallback && typeof attachment.fallback !== 'string') return false;
      if (attachment.color && typeof attachment.color !== 'string') return false;
      if (attachment.title && typeof attachment.title !== 'string') return false;
      if (attachment.text && typeof attachment.text !== 'string') return false;
      
      return true;
    });
  }

  /**
   * Validate complete message payload
   */
  static validateMessagePayload(payload: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!payload || typeof payload !== 'object') {
      errors.push('Payload must be an object');
      return { isValid: false, errors };
    }
    
    // Required fields
    if (!payload.channel) {
      errors.push('channel is required');
    }
    
    if (!payload.text && !payload.blocks && !payload.attachments) {
      errors.push('Either text, blocks, or attachments must be provided');
    }
    
    // Validate channel format
    if (payload.channel && !this.validateChannelName(payload.channel) && !this.validateChannelId(payload.channel)) {
      errors.push('Invalid channel format');
    }
    
    // Validate text length
    if (payload.text && !this.validateMessageText(payload.text)) {
      errors.push('Message text is invalid or too long');
    }
    
    // Validate attachments if present
    if (payload.attachments && !this.validateAttachments(payload.attachments)) {
      errors.push('Invalid attachments format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate message text
   */
  static validateMessageText(text: string): boolean {
    if (typeof text !== 'string') return false;
    if (text.length === 0) return false;
    if (text.length > 4000) return false; // Slack limit
    return true;
  }

  /**
   * Validate channel name format
   */
  static validateChannelName(name: string): boolean {
    if (typeof name !== 'string') return false;
    if (name.length === 0) return false;
    
    // Channel names can start with # or not
    const cleanName = name.startsWith('#') ? name.slice(1) : name;
    
    // Must be lowercase, can contain letters, numbers, hyphens, underscores
    const channelNameRegex = /^[a-z0-9_-]+$/;
    return channelNameRegex.test(cleanName) && cleanName.length <= 80;
  }

  /**
   * Validate channel ID format
   */
  static validateChannelId(id: string): boolean {
    if (typeof id !== 'string') return false;
    // Slack channel IDs start with C and are followed by alphanumeric characters
    const channelIdRegex = /^C[A-Z0-9]{8,}$/;
    return channelIdRegex.test(id);
  }

  /**
   * Get validation errors without throwing
   */
  static getErrors<T>(schema: z.ZodSchema<T>, data: any): string[] {
    try {
      schema.parse(data);
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors.map(err => {
          const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
          return `${path}${err.message}`;
        });
      }
      return ['Unknown validation error'];
    }
  }
}
