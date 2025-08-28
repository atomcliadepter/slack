# API Reference - Enhanced MCP Slack SDK v2.0.0

## MCP Server Endpoints

### Tool List
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### Tool Execution
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "slack_send_message",
    "arguments": {
      "channel": "general",
      "text": "Hello World"
    }
  }
}
```

## Available Tools (32)

### Core Communication
- `slack_send_message` - Send messages with Block Kit support
- `slack_chat_update` - Edit messages with change tracking
- `slack_chat_delete` - Secure message deletion
- `slack_get_channel_history` - Retrieve message history
- `slack_search_messages` - Advanced message search

### Channel Management
- `slack_create_channel` - Smart channel creation
- `slack_list_channels` - Channel discovery with filtering
- `slack_join_channel` - Safe channel joining
- `slack_leave_channel` - Channel leaving with safety checks
- `slack_archive_channel` - Channel archiving with backups
- `slack_conversations_info` - Channel information analysis
- `slack_conversations_members` - Member management
- `slack_conversations_history` - Advanced history retrieval
- `slack_conversations_replies` - Thread management
- `slack_conversations_mark` - Read status management

### User Management
- `slack_users_info` - Comprehensive user analysis
- `slack_users_list` - Advanced user directory
- `slack_users_lookup_by_email` - Email-based lookup
- `slack_list_users` - Basic user listing
- `slack_set_status` - Status management with templates

### File & Content
- `slack_upload_file` - File upload with analysis
- `slack_bookmarks_list` - Bookmark management
- `slack_pins_add` - Smart pin management
- `slack_pins_remove` - Pin removal with context
- `slack_pins_list` - Pin analysis

### Engagement
- `slack_reactions_add` - Reaction management
- `slack_reactions_remove` - Reaction removal
- `slack_reactions_get` - Reaction analysis

### Advanced Features
- `slack_auth_test` - Authentication testing
- `slack_workspace_info` - Workspace analytics
- `slack_views_publish` - Block Kit view publishing
- `slack_events_tail` - Real-time event streaming

## Response Format

All tools return standardized responses:

```json
{
  "success": true,
  "data": {
    // Tool-specific data
  },
  "metadata": {
    "execution_time_ms": 150,
    "timestamp": "2025-08-28T05:10:00.000Z"
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "metadata": {
    "execution_time_ms": 50,
    "timestamp": "2025-08-28T05:10:00.000Z"
  }
}
```
