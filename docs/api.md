
# Enhanced MCP Slack SDK API Documentation

## Overview

The Enhanced MCP Slack SDK provides comprehensive tools for interacting with Slack workspaces through the Model Context Protocol (MCP). This documentation covers all available tools and their usage.

## Available Tools

### 1. slack_send_message
Send messages to Slack channels or direct messages.

**Parameters:**
- `channel` (string, required): Channel ID or name
- `text` (string, required): Message text
- `thread_ts` (string, optional): Thread timestamp for replies
- `blocks` (array, optional): Slack Block Kit elements
- `attachments` (array, optional): Message attachments
- `unfurl_links` (boolean, optional): Unfurl links in message
- `unfurl_media` (boolean, optional): Unfurl media in message

### 2. slack_get_channel_history
Retrieve message history from a Slack channel.

**Parameters:**
- `channel` (string, required): Channel ID or name
- `limit` (number, optional): Number of messages to retrieve (default: 100)
- `oldest` (string, optional): Start of time range
- `latest` (string, optional): End of time range
- `inclusive` (boolean, optional): Include messages with oldest and latest timestamps

### 3. slack_create_channel
Create a new Slack channel.

**Parameters:**
- `name` (string, required): Channel name (lowercase, no spaces)
- `is_private` (boolean, optional): Create private channel (default: false)
- `topic` (string, optional): Channel topic
- `purpose` (string, optional): Channel purpose

### 4. slack_get_user_info
Get detailed information about a Slack user.

**Parameters:**
- `user` (string, required): User ID or username
- `include_locale` (boolean, optional): Include user locale information

### 5. slack_upload_file
Upload a file to Slack channels.

**Parameters:**
- `channels` (array, required): List of channel IDs or names
- `file_path` (string, required): Path to file to upload
- `filename` (string, optional): Custom filename
- `title` (string, optional): File title
- `initial_comment` (string, optional): Initial comment
- `thread_ts` (string, optional): Thread timestamp for replies

### 6. slack_search_messages
Search for messages across the workspace.

**Parameters:**
- `query` (string, required): Search query
- `sort` (string, optional): Sort by 'score' or 'timestamp' (default: 'score')
- `sort_dir` (string, optional): Sort direction 'asc' or 'desc' (default: 'desc')
- `highlight` (boolean, optional): Highlight search terms
- `count` (number, optional): Number of results to return
- `page` (number, optional): Page number for pagination

### 7. slack_set_status
Set the current user's Slack status.

**Parameters:**
- `status_text` (string, required): Status text
- `status_emoji` (string, optional): Status emoji
- `status_expiration` (number, optional): Status expiration timestamp

### 8. slack_get_workspace_info
Get information about the Slack workspace.

**Parameters:**
- `include_icon` (boolean, optional): Include workspace icon information

### 9. slack_list_channels
List all channels in the workspace with advanced filtering and analytics.

**Parameters:**
- `types` (string, optional): Comma-separated channel types (default: 'public_channel,private_channel')
- `exclude_archived` (boolean, optional): Exclude archived channels (default: true)
- `limit` (number, optional): Maximum channels to return (1-1000, default: 100)
- `cursor` (string, optional): Pagination cursor
- `include_member_count` (boolean, optional): Include member counts (default: true)
- `include_purpose_topic` (boolean, optional): Include purpose/topic details (default: true)
- `sort_by` (string, optional): Sort by 'name', 'created', 'member_count', 'last_activity' (default: 'name')
- `sort_direction` (string, optional): Sort direction 'asc' or 'desc' (default: 'asc')
- `name_filter` (string, optional): Filter channels by name
- `include_analytics` (boolean, optional): Include channel analytics (default: false)

**Response includes:**
- Channel list with enhanced metadata
- Summary statistics (total channels, by type, by status, member stats, content stats)
- Pagination information
- Execution metadata

### 10. slack_list_users (NEW)
List all users in the workspace with advanced filtering, analytics, and presence tracking.

**Parameters:**
- `limit` (number, optional): Maximum users to return (1-1000, default: 100)
- `cursor` (string, optional): Pagination cursor
- `include_locale` (boolean, optional): Include user locale information (default: false)
- `include_presence` (boolean, optional): Include presence status (default: true)
- `include_profile_analytics` (boolean, optional): Include profile completeness analytics (default: true)
- `filter_by_status` (string, optional): Filter by presence status: 'active', 'away', 'dnd', 'all' (default: 'all')
- `filter_by_role` (string, optional): Filter by role: 'admin', 'owner', 'member', 'guest', 'restricted', 'ultra_restricted', 'all' (default: 'all')
- `filter_by_account_type` (string, optional): Filter by account type: 'regular', 'bot', 'app', 'workflow_bot', 'all' (default: 'all')
- `include_deleted` (boolean, optional): Include deleted users (default: false)
- `include_bots` (boolean, optional): Include bot users (default: true)
- `sort_by` (string, optional): Sort by 'name', 'real_name', 'display_name', 'status', 'last_activity', 'profile_score' (default: 'name')
- `sort_direction` (string, optional): Sort direction 'asc' or 'desc' (default: 'asc')
- `name_filter` (string, optional): Filter users by name (partial match)
- `timezone_filter` (string, optional): Filter by timezone (e.g., 'America/New_York')
- `department_filter` (string, optional): Filter by department/title
- `include_activity_analytics` (boolean, optional): Include activity analytics (default: false)

**Response includes:**
- User list with enhanced metadata and analysis
- Presence information (when requested)
- Profile analytics including completeness scores
- Activity analytics (when requested)
- Summary statistics (total users, by type, by role, by status, profile stats, activity stats)
- Pagination information
- Execution metadata

**Enhanced Features:**
- **Advanced Filtering**: Filter by presence status, role, account type, timezone, department
- **Profile Analytics**: Completeness scoring, custom avatar detection, contact info analysis
- **Presence Tracking**: Real-time presence status, connection counts, last activity
- **Activity Analytics**: Activity level estimation, engagement metrics
- **Smart Sorting**: Sort by profile completeness, activity level, or standard fields
- **Comprehensive Statistics**: Detailed breakdowns by type, role, status, and engagement

## Usage Examples

### List Active Users with Analytics
```javascript
const result = await slackListUsersTool.execute({
  filter_by_status: 'active',
  include_profile_analytics: true,
  include_activity_analytics: true,
  sort_by: 'profile_score',
  sort_direction: 'desc'
});
```

### Find Users by Department
```javascript
const result = await slackListUsersTool.execute({
  department_filter: 'engineering',
  filter_by_account_type: 'regular',
  sort_by: 'real_name'
});
```

### Get Workspace Overview
```javascript
const result = await slackListUsersTool.execute({
  include_profile_analytics: true,
  include_presence: true,
  limit: 1000
});
// Check result.summary for comprehensive statistics
```

## Error Handling

All tools return a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "metadata": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

## Rate Limiting

The SDK implements intelligent rate limiting and retry mechanisms to handle Slack API limits gracefully. All tools will automatically retry failed requests with exponential backoff.

## Authentication

Ensure your Slack bot token has the necessary scopes for the tools you plan to use:

- `channels:read` - For channel operations
- `users:read` - For user operations  
- `users:read.email` - For user email information
- `chat:write` - For sending messages
- `files:write` - For file uploads
- `search:read` - For message search
- `users:write` - For status updates

