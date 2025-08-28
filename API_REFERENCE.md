# API Reference - Enhanced MCP Slack SDK v2.0.0

## Overview

The Enhanced MCP Slack SDK provides 33 fully functional tools for comprehensive Slack workspace management through the Model Context Protocol (MCP).

## MCP Protocol Usage

### List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### Execute Tool
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "slack_send_message",
    "arguments": {
      "channel": "general",
      "text": "Hello World!"
    }
  }
}
```

## Available Tools (33 total)

### slack_archive_channel
**Description**: Archive a Slack channel with advanced validation, safety checks, and comprehensive analytics

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID or name to archive"
    },
    "validate_permissions": {
      "type": "boolean",
      "description": "Validate user permissions before archiving"
    },
    "include_archive_analytics": {
      "type": "boolean",
      "description": "Include comprehensive archive analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_auth_test
**Description**: Test Slack authentication and analyze connection security with comprehensive insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "include_analytics": {
      "type": "boolean",
      "description": "Include authentication analytics"
    },
    "include_recommendations": {
      "type": "boolean", 
      "description": "Include security recommendations"
    }
  }
}
```

### slack_bookmarks_list
**Description**: List and analyze channel bookmarks with intelligent categorization and management insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel_id": {
      "type": "string",
      "description": "Channel ID to list bookmarks for"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include bookmark analytics"
    }
  },
  "required": ["channel_id"]
}
```

### slack_chat_delete
**Description**: Delete Slack messages with comprehensive safety checks, backup creation, and impact analysis

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID where message is located"
    },
    "ts": {
      "type": "string", 
      "description": "Timestamp of message to delete"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include deletion analytics"
    }
  },
  "required": ["channel", "ts"]
}
```

### slack_chat_update
**Description**: Update Slack messages with advanced validation, change tracking, and impact analysis

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID where message is located"
    },
    "ts": {
      "type": "string",
      "description": "Timestamp of message to update"
    },
    "text": {
      "type": "string",
      "description": "New message text"
    }
  },
  "required": ["channel", "ts", "text"]
}
```

### slack_conversations_history
**Description**: Retrieve and analyze conversation history with advanced filtering, analytics, and insights

**Input Schema**:
```json
{
  "type": "object", 
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID to get history for"
    },
    "limit": {
      "type": "number",
      "description": "Number of messages to retrieve"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include conversation analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_conversations_info
**Description**: Get comprehensive channel information with detailed analytics and health assessment

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string", 
      "description": "Channel ID to get information for"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include channel analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_conversations_mark
**Description**: Mark conversations as read with advanced analytics and engagement insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID to mark as read"
    },
    "ts": {
      "type": "string",
      "description": "Timestamp to mark as read up to"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include read analytics"
    }
  },
  "required": ["channel", "ts"]
}
```

### slack_conversations_members
**Description**: List and analyze channel members with advanced filtering and management insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID to list members for"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of members to return"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include member analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_conversations_open
**Description**: Open direct message or multi-party direct message conversations with specified users

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "users": {
      "type": "string",
      "description": "Comma-separated list of user IDs to open conversation with"
    },
    "return_im": {
      "type": "boolean",
      "description": "Return IM channel if only one user specified"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include conversation analytics"
    }
  },
  "required": ["users"]
}
```

### slack_conversations_replies
**Description**: Get thread replies with comprehensive analytics and conversation flow insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID containing the thread"
    },
    "ts": {
      "type": "string", 
      "description": "Timestamp of parent message"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include thread analytics"
    }
  },
  "required": ["channel", "ts"]
}
```

### slack_create_channel
**Description**: Create Slack channels with templates, user invitations, and comprehensive setup analytics

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Channel name"
    },
    "is_private": {
      "type": "boolean",
      "description": "Create as private channel"
    },
    "template": {
      "type": "string",
      "description": "Channel template to use"
    }
  },
  "required": ["name"]
}
```

### slack_events_tail
**Description**: Monitor real-time Slack events with intelligent filtering and comprehensive analytics

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "duration": {
      "type": "number",
      "description": "Duration to monitor events (seconds)"
    },
    "event_types": {
      "type": "array",
      "description": "Event types to monitor"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include event analytics"
    }
  }
}
```

### slack_get_channel_history
**Description**: Get channel message history with advanced filtering and analytics capabilities

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID or name"
    },
    "limit": {
      "type": "number",
      "description": "Number of messages to retrieve"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include message analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_join_channel
**Description**: Join Slack channels with intelligent validation, analytics, and safety checks

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID or name to join"
    },
    "validate_permissions": {
      "type": "boolean",
      "description": "Validate permissions before joining"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include join analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_leave_channel
**Description**: Leave Slack channels with advanced safety checks and comprehensive analytics

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID or name to leave"
    },
    "validate_permissions": {
      "type": "boolean",
      "description": "Validate permissions before leaving"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include leave analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_list_channels
**Description**: List and analyze Slack channels with advanced filtering, sorting, and insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "Maximum number of channels to return"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include channel analytics"
    },
    "sort_by": {
      "type": "string",
      "description": "Field to sort channels by"
    }
  }
}
```

### slack_list_users
**Description**: List and analyze workspace users with advanced filtering and comprehensive insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "Maximum number of users to return"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include user analytics"
    },
    "include_presence": {
      "type": "boolean",
      "description": "Include real-time presence information"
    }
  }
}
```

### slack_pins_add
**Description**: Pin messages with intelligent analysis and comprehensive pin management insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID where message is located"
    },
    "timestamp": {
      "type": "string",
      "description": "Timestamp of message to pin"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include pin analytics"
    }
  },
  "required": ["channel", "timestamp"]
}
```

### slack_pins_list
**Description**: List and analyze pinned messages with comprehensive management insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID to list pins for"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include pin analytics"
    }
  },
  "required": ["channel"]
}
```

### slack_pins_remove
**Description**: Remove pinned messages with context analysis and impact assessment

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID where pinned message is located"
    },
    "timestamp": {
      "type": "string",
      "description": "Timestamp of message to unpin"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include unpin analytics"
    }
  },
  "required": ["channel", "timestamp"]
}
```

### slack_reactions_add
**Description**: Add reactions to messages with intelligent validation and comprehensive analytics

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID where message is located"
    },
    "timestamp": {
      "type": "string",
      "description": "Timestamp of message to react to"
    },
    "name": {
      "type": "string",
      "description": "Emoji name for reaction"
    }
  },
  "required": ["channel", "timestamp", "name"]
}
```

### slack_reactions_get
**Description**: Get message reactions with comprehensive analysis and engagement insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID where message is located"
    },
    "timestamp": {
      "type": "string",
      "description": "Timestamp of message to get reactions for"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include reaction analytics"
    }
  },
  "required": ["channel", "timestamp"]
}
```

### slack_reactions_remove
**Description**: Remove reactions from messages with impact analysis and engagement insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID where message is located"
    },
    "timestamp": {
      "type": "string",
      "description": "Timestamp of message to remove reaction from"
    },
    "name": {
      "type": "string",
      "description": "Emoji name to remove"
    }
  },
  "required": ["channel", "timestamp", "name"]
}
```

### slack_search_messages
**Description**: Search Slack messages with advanced filtering, analytics, and intelligent insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    },
    "channel_filter": {
      "type": "array",
      "description": "Channels to search in"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include search analytics"
    }
  },
  "required": ["query"]
}
```

### slack_send_message
**Description**: Send messages to Slack channels with advanced formatting and comprehensive analytics

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channel": {
      "type": "string",
      "description": "Channel ID or name to send message to"
    },
    "text": {
      "type": "string",
      "description": "Message text"
    },
    "blocks": {
      "type": "array",
      "description": "Block Kit blocks for rich formatting"
    }
  },
  "required": ["channel"]
}
```

### slack_set_status
**Description**: Set user status with intelligent templates and comprehensive status management

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "status_text": {
      "type": "string",
      "description": "Status text"
    },
    "status_emoji": {
      "type": "string",
      "description": "Status emoji"
    },
    "template": {
      "type": "string",
      "description": "Status template to use"
    }
  }
}
```

### slack_upload_file
**Description**: Upload files to Slack with advanced analysis and comprehensive upload management

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "channels": {
      "type": "array",
      "description": "Channels to upload file to"
    },
    "file_path": {
      "type": "string",
      "description": "Path to file to upload"
    },
    "title": {
      "type": "string",
      "description": "File title"
    }
  },
  "required": ["channels"]
}
```

### slack_users_info
**Description**: Get comprehensive user information with detailed analytics and profile insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "string",
      "description": "User ID or username"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include user analytics"
    },
    "include_presence": {
      "type": "boolean",
      "description": "Include presence information"
    }
  },
  "required": ["user"]
}
```

### slack_users_list
**Description**: List workspace users with advanced filtering and comprehensive directory management

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "Maximum number of users to return"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include comprehensive workspace analytics"
    },
    "filter_by_name": {
      "type": "string",
      "description": "Filter users by name"
    }
  }
}
```

### slack_users_lookup_by_email
**Description**: Look up users by email with comprehensive analysis and security insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "description": "Email address to look up"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include user lookup analytics"
    },
    "include_presence": {
      "type": "boolean",
      "description": "Include presence information"
    }
  },
  "required": ["email"]
}
```

### slack_views_publish
**Description**: Publish Block Kit views with advanced validation and comprehensive UX analytics

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "description": "User ID to publish view for"
    },
    "view": {
      "type": "object",
      "description": "Block Kit view definition"
    },
    "include_analytics": {
      "type": "boolean",
      "description": "Include view analytics"
    }
  },
  "required": ["user_id", "view"]
}
```

### slack_workspace_info
**Description**: Get comprehensive workspace information with detailed analytics and health insights

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "include_analytics": {
      "type": "boolean",
      "description": "Include workspace analytics"
    },
    "include_stats": {
      "type": "boolean",
      "description": "Include workspace statistics"
    },
    "detailed_analysis": {
      "type": "boolean",
      "description": "Include detailed workspace analysis"
    }
  }
}
```

## Response Format

All tools return responses in the following format:

```json
{
  "success": true,
  "data": {
    // Tool-specific response data
  },
  "metadata": {
    "execution_time_ms": 150
  }
}
```

For errors:

```json
{
  "success": false,
  "error": "Error description",
  "metadata": {
    "execution_time_ms": 50
  }
}
```

## Authentication

Set the following environment variables:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
```

## Rate Limits

The SDK automatically handles Slack API rate limits with intelligent retry mechanisms and exponential backoff.
