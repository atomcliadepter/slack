
/**
 * Type definitions for Enhanced MCP Slack SDK
 */

export interface SlackMessage {
  ts: string;
  channel: string;
  text: string;
  user?: string;
  thread_ts?: string;
  blocks?: any[];
  attachments?: any[];
  reactions?: any[];
  replies?: any[];
  files?: any[];
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  num_members?: number;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  email?: string;
  is_bot: boolean;
  is_admin: boolean;
  is_owner: boolean;
  profile?: {
    display_name?: string;
    real_name?: string;
    email?: string;
    image_72?: string;
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
  };
  presence?: {
    presence: 'active' | 'away';
    online: boolean;
    auto_away: boolean;
    manual_away: boolean;
    connection_count: number;
    last_activity: number;
  };
}

export interface SlackFile {
  id: string;
  name: string;
  title?: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private: string;
  url_private_download: string;
  permalink: string;
  permalink_public?: string;
  channels: string[];
  created: number;
  user: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    execution_time_ms: number;
    tool: string;
    timestamp: string;
    [key: string]: any;
  };
}

export interface SearchResult {
  messages: SlackMessage[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  domain: string;
  url: string;
  enterprise_id?: string;
  enterprise_name?: string;
  icon?: any;
  bot_info: {
    id: string;
    name: string;
    is_enterprise_install: boolean;
  };
}

export interface ChannelStatistics {
  total_channels: number;
  public_channels: number;
  private_channels: number;
  archived_channels: number;
  active_channels: number;
  average_members_per_channel: number;
  largest_channel: number;
}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  bot_users: number;
  admin_users: number;
  guest_users: number;
  users_with_custom_images: number;
  users_with_status: number;
  profile_completion_rate: number;
}

export interface StatusTemplate {
  text: string;
  emoji: string;
  duration_minutes?: number;
}

export interface FileAnalysis {
  size_bytes: number;
  size_human: string;
  type: string;
  extension: string;
  is_image: boolean;
  is_document: boolean;
  is_code: boolean;
  is_archive: boolean;
  mime_type: string;
  has_preview: boolean;
  has_thumbnail: boolean;
}

export interface MessageAnalysis {
  word_count: number;
  character_count: number;
  has_mentions: boolean;
  has_channels: boolean;
  has_urls: boolean;
  has_code: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  has_reactions: boolean;
  has_replies: boolean;
  has_attachments: boolean;
  has_blocks: boolean;
  has_files: boolean;
  is_thread_parent: boolean;
  is_thread_reply: boolean;
}

export interface WorkspaceInsight {
  type: string;
  level: 'info' | 'warning' | 'suggestion' | 'error';
  message: string;
}
