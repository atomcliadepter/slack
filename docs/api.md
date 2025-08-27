# Enhanced MCP Slack SDK API Documentation

## Overview

The Enhanced MCP Slack SDK provides 33 comprehensive tools for Slack integration through the Model Context Protocol (MCP). Each tool is designed with production-ready features including error handling, validation, logging, and analytics.

## Tool Categories

### Core Messaging Tools

#### slack_send_message
Send enhanced messages with Block Kit support, threading, and rich formatting.

**Parameters:**
- `channel` (string, required): Channel ID, name, or user ID for DM
- `text` (string, required): Message text with Slack markdown support
- `thread_ts` (string, optional): Parent message timestamp for threading
- `blocks` (array, optional): Slack Block Kit blocks for rich formatting
- `attachments` (array, optional): Legacy message attachments
- `unfurl_links` (boolean, optional): Enable automatic link unfurling
- `unfurl_media` (boolean, optional): Enable automatic media unfurling

**Example:**
```json
{
  "channel": "general",
  "text": "Hello from Enhanced MCP!",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Project Update*\nDeployment completed successfully! 🚀"
      }
    }
  ]
}
```

#### slack_chat_update
Update existing messages with enhanced formatting and validation.

**Parameters:**
- `channel` (string, required): Channel containing the message
- `ts` (string, required): Timestamp of message to update
- `text` (string, optional): New message text
- `blocks` (array, optional): New Block Kit blocks
- `attachments` (array, optional): New attachments

#### slack_chat_delete
Delete messages with proper permissions and logging.

**Parameters:**
- `channel` (string, required): Channel containing the message
- `ts` (string, required): Timestamp of message to delete

### Channel Management Tools

#### slack_create_channel
Create channels with templates and automation.

**Parameters:**
- `name` (string, required): Channel name (auto-sanitized)
- `is_private` (boolean, optional): Create private channel
- `template` (string, optional): Channel template (project, team, support, etc.)
- `invite_users` (array, optional): Users to invite automatically
- `send_welcome_message` (boolean, optional): Send welcome message

#### slack_list_channels
List and filter channels with advanced metadata.

**Parameters:**
- `types` (array, optional): Channel types to include
- `exclude_archived` (boolean, optional): Exclude archived channels
- `limit` (number, optional): Maximum channels to return
- `cursor` (string, optional): Pagination cursor

#### slack_join_channel
Join channels with validation and error handling.

**Parameters:**
- `channel` (string, required): Channel ID or name to join

#### slack_leave_channel
Leave channels with proper cleanup.

**Parameters:**
- `channel` (string, required): Channel ID or name to leave

#### slack_archive_channel
Archive channels with backup and notification.

**Parameters:**
- `channel` (string, required): Channel ID or name to archive

### Conversation & History Tools

#### slack_get_channel_history
Retrieve channel history with intelligent filtering.

**Parameters:**
- `channel` (string, required): Channel ID or name
- `latest` (string, optional): End of time range
- `oldest` (string, optional): Start of time range
- `inclusive` (boolean, optional): Include messages with latest and oldest timestamps
- `limit` (number, optional): Number of messages to return
- `cursor` (string, optional): Pagination cursor

#### slack_conversations_info
Get detailed channel/conversation information.

**Parameters:**
- `channel` (string, required): Channel ID
- `include_locale` (boolean, optional): Include locale information
- `include_num_members` (boolean, optional): Include member count

#### slack_conversations_history
Advanced conversation history with pagination.

**Parameters:**
- `channel` (string, required): Channel ID
- `cursor` (string, optional): Pagination cursor
- `inclusive` (boolean, optional): Include boundary messages
- `latest` (string, optional): End of time range
- `limit` (number, optional): Number of messages to return
- `oldest` (string, optional): Start of time range

#### slack_conversations_members
List conversation members with roles.

**Parameters:**
- `channel` (string, required): Channel ID
- `cursor` (string, optional): Pagination cursor
- `limit` (number, optional): Number of members to return

#### slack_conversations_replies
Get thread replies with context.

**Parameters:**
- `channel` (string, required): Channel ID
- `ts` (string, required): Parent message timestamp
- `cursor` (string, optional): Pagination cursor
- `inclusive` (boolean, optional): Include boundary messages
- `latest` (string, optional): End of time range
- `limit` (number, optional): Number of replies to return
- `oldest` (string, optional): Start of time range

#### slack_conversations_mark
Mark conversations as read with timestamps.

**Parameters:**
- `channel` (string, required): Channel ID
- `ts` (string, required): Timestamp to mark as read

### User Management Tools

#### slack_get_user_info
Get enhanced user profiles with analytics.

**Parameters:**
- `user` (string, required): User ID or username
- `include_locale` (boolean, optional): Include locale information

#### slack_users_info
Get detailed user information with presence.

**Parameters:**
- `user` (string, required): User ID
- `include_locale` (boolean, optional): Include locale information

#### slack_users_list
List users with filtering and pagination.

**Parameters:**
- `cursor` (string, optional): Pagination cursor
- `include_locale` (boolean, optional): Include locale information
- `limit` (number, optional): Number of users to return
- `team_id` (string, optional): Team ID to list users from

#### slack_list_users
Alternative user listing with enhanced metadata.

**Parameters:**
- `presence` (boolean, optional): Include presence information
- `limit` (number, optional): Maximum users to return

#### slack_users_lookup_by_email
Find users by email address.

**Parameters:**
- `email` (string, required): Email address to lookup

### Reactions & Interactions

#### slack_reactions_add
Add reactions with emoji validation.

**Parameters:**
- `channel` (string, required): Channel containing the message
- `name` (string, required): Emoji name (without colons)
- `timestamp` (string, required): Message timestamp

#### slack_reactions_remove
Remove reactions with proper permissions.

**Parameters:**
- `channel` (string, required): Channel containing the message
- `name` (string, required): Emoji name (without colons)
- `timestamp` (string, required): Message timestamp

#### slack_reactions_get
Get reaction details and analytics.

**Parameters:**
- `channel` (string, optional): Channel containing the message
- `file` (string, optional): File to get reactions for
- `file_comment` (string, optional): File comment to get reactions for
- `full` (boolean, optional): Return full reaction details
- `timestamp` (string, optional): Message timestamp

### Pins & Bookmarks

#### slack_pins_add
Pin messages with context and notifications.

**Parameters:**
- `channel` (string, required): Channel ID
- `timestamp` (string, required): Message timestamp to pin

#### slack_pins_remove
Unpin messages with proper validation.

**Parameters:**
- `channel` (string, required): Channel ID
- `timestamp` (string, required): Message timestamp to unpin

#### slack_pins_list
List pinned items with metadata.

**Parameters:**
- `channel` (string, required): Channel ID

#### slack_bookmarks_list
List channel bookmarks and shortcuts.

**Parameters:**
- `channel_id` (string, required): Channel ID

### Search & Discovery

#### slack_search_messages
AI-powered search with advanced filtering.

**Parameters:**
- `query` (string, required): Search query
- `count` (number, optional): Number of results to return
- `highlight` (boolean, optional): Highlight search terms
- `page` (number, optional): Page number for pagination
- `sort` (string, optional): Sort order (score, timestamp)
- `sort_dir` (string, optional): Sort direction (asc, desc)

### File Management

#### slack_upload_file
Advanced file upload with multi-channel support.

**Parameters:**
- `channels` (array, optional): Channels to upload to
- `content` (string, optional): File content as string
- `file` (string, optional): File path to upload
- `filename` (string, optional): Filename for the upload
- `filetype` (string, optional): File type
- `initial_comment` (string, optional): Initial comment
- `thread_ts` (string, optional): Thread timestamp
- `title` (string, optional): File title

### Status & Presence

#### slack_set_status
Intelligent status management with templates.

**Parameters:**
- `status_text` (string, optional): Status text
- `status_emoji` (string, optional): Status emoji
- `status_expiration` (number, optional): Expiration timestamp

### Workspace & Analytics

#### slack_get_workspace_info
Comprehensive workspace analytics.

**Parameters:**
- `domain` (string, optional): Workspace domain

#### slack_auth_test
Authentication testing and validation.

**Parameters:** None

### Advanced Features

#### slack_views_publish
Publish App Home views and modals.

**Parameters:**
- `user_id` (string, required): User ID to publish view for
- `view` (object, required): View payload

#### slack_events_tail
Real-time event monitoring and logging.

**Parameters:**
- `pretty` (boolean, optional): Pretty print events
- `token` (string, optional): Authentication token

## Response Format

All tools return a standardized response format:

```json
{
  "success": true,
  "data": {
    // Tool-specific response data
  },
  "metadata": {
    "execution_time_ms": 150,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "slack_send_message"
  }
}
```

## Error Handling

Errors are returned in a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "error_code": "SLACK_API_ERROR",
  "metadata": {
    "execution_time_ms": 50,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "tool": "slack_send_message"
  }
}
```

## Rate Limiting

The SDK includes built-in rate limiting and retry logic:
- Automatic retry with exponential backoff
- Respect for Slack API rate limits
- Configurable timeout and retry settings
- Request queuing for high-volume usage

## Authentication

All tools use the configured Slack bot token from environment variables:
- `SLACK_BOT_TOKEN`: Primary bot token for API calls
- `SLACK_USER_TOKEN`: Optional user token for user-specific operations
- `SLACK_APP_TOKEN`: Optional app token for Socket Mode

## Validation

Input validation is performed using Zod schemas:
- Type checking for all parameters
- Required field validation
- Format validation for IDs and timestamps
- Custom validation rules for Slack-specific formats
