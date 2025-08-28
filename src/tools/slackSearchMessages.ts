import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  channel_filter: z.array(z.string()).optional(),
  user_filter: z.array(z.string()).optional(),
  date_range: z.object({
    after: z.string().optional(),
    before: z.string().optional(),
  }).optional(),
  has_files: z.boolean().optional(),
  has_links: z.boolean().optional(),
  has_reactions: z.boolean().optional(),
  message_type: z.enum(['all', 'messages', 'files']).optional().default('all'),
  sort_by: z.enum(['timestamp', 'score']).optional().default('score'),
  sort_direction: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.number().min(1).max(100).optional().default(20),
  include_context: z.boolean().optional().default(false),
  context_size: z.number().min(1).max(10).optional().default(2),
  include_analytics: z.boolean().optional().default(true),
  highlight_matches: z.boolean().optional().default(true),
});

type InputArgs = z.infer<typeof inputSchema>;

interface SearchResult {
  success: boolean;
  query: string;
  total_matches: number;
  messages: Array<{
    channel: string;
    channel_name?: string;
    user: string;
    username?: string;
    timestamp: string;
    text: string;
    highlighted_text?: string;
    score?: number;
    context?: {
      before: any[];
      after: any[];
    };
    metadata: {
      has_files: boolean;
      has_links: boolean;
      has_reactions: boolean;
      reaction_count: number;
      reply_count: number;
      thread_ts?: string;
    };
  }>;
  analytics?: {
    search_insights: {
      query_complexity: string;
      match_distribution: Record<string, number>;
      temporal_patterns: {
        peak_activity_periods: string[];
        message_frequency: string;
        date_range_coverage: string;
      };
    };
    content_analysis: {
      most_active_users: Array<{ user: string; message_count: number }>;
      most_active_channels: Array<{ channel: string; message_count: number }>;
      content_types: {
        text_only: number;
        with_files: number;
        with_links: number;
        with_reactions: number;
      };
    };
    engagement_metrics: {
      average_reactions_per_message: number;
      average_replies_per_message: number;
      engagement_score: number;
      viral_content_indicators: string[];
    };
  };
  recommendations?: {
    search_refinements: string[];
    related_queries: string[];
    workflow_tips: string[];
  };
  filters_applied: {
    channels: string[];
    users: string[];
    date_range?: { after?: string; before?: string };
    content_filters: string[];
  };
  metadata: {
    execution_time_ms: number;
    api_calls_made: number;
    search_timestamp: string;
    results_truncated: boolean;
  };
}

export const slackSearchMessagesTool: MCPTool = {
  name: 'slack_search_messages',
  description: 'Advanced message search across Slack workspace with comprehensive filtering, analytics, and context',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string (supports Slack search operators)',
      },
      channel_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter results to specific channels (names or IDs)',
      },
      user_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter results to specific users (usernames or IDs)',
      },
      date_range: {
        type: 'object',
        properties: {
          after: { type: 'string', description: 'Search after this date (YYYY-MM-DD)' },
          before: { type: 'string', description: 'Search before this date (YYYY-MM-DD)' },
        },
        description: 'Date range filter for messages',
      },
      has_files: {
        type: 'boolean',
        description: 'Filter messages that contain file attachments',
      },
      has_links: {
        type: 'boolean',
        description: 'Filter messages that contain links',
      },
      has_reactions: {
        type: 'boolean',
        description: 'Filter messages that have reactions',
      },
      message_type: {
        type: 'string',
        enum: ['all', 'messages', 'files'],
        description: 'Type of content to search',
        default: 'all',
      },
      sort_by: {
        type: 'string',
        enum: ['timestamp', 'score'],
        description: 'Sort results by timestamp or relevance score',
        default: 'score',
      },
      sort_direction: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort direction',
        default: 'desc',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of results to return',
        default: 20,
      },
      include_context: {
        type: 'boolean',
        description: 'Include surrounding messages for context',
        default: false,
      },
      context_size: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Number of context messages before and after each result',
        default: 2,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include detailed search analytics and insights',
        default: true,
      },
      highlight_matches: {
        type: 'boolean',
        description: 'Highlight search terms in results',
        default: true,
      },
    },
    required: ['query'],
  },

  async execute(args: Record<string, any>): Promise<SearchResult> {
    const startTime = Date.now();
    let apiCallCount = 0;

    try {
      const validatedArgs = Validator.validate(inputSchema, args) as InputArgs;
      
      // Build search query with filters
      const searchQuery = await buildSearchQuery(validatedArgs);
      
      // Perform the search
      const searchResponse = await (slackClient as any).client.search.messages({
        query: searchQuery,
        sort: validatedArgs.sort_by,
        sort_dir: validatedArgs.sort_direction,
        count: validatedArgs.limit,
      });
      apiCallCount++;

      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.error}`);
      }

      const searchResults = searchResponse.messages;
      if (!searchResults) {
        throw new Error('No search results returned');
      }

      // Process and enhance results
      const processedMessages = await processSearchResults(
        searchResults.matches || [],
        validatedArgs,
        apiCallCount
      );
      apiCallCount = processedMessages.apiCallCount;

      // Build comprehensive result
      const result: SearchResult = {
        success: true,
        query: validatedArgs.query,
        total_matches: searchResults.total || 0,
        messages: processedMessages.messages,
        filters_applied: {
          channels: validatedArgs.channel_filter || [],
          users: validatedArgs.user_filter || [],
          date_range: validatedArgs.date_range,
          content_filters: buildContentFilters(validatedArgs),
        },
        metadata: {
          execution_time_ms: Date.now() - startTime,
          api_calls_made: apiCallCount,
          search_timestamp: new Date().toISOString(),
          results_truncated: (searchResults.total || 0) > validatedArgs.limit,
        },
      };

      // Add analytics if requested
      if (validatedArgs.include_analytics) {
        result.analytics = generateSearchAnalytics(
          processedMessages.messages,
          validatedArgs,
          searchResults
        );
        result.recommendations = generateSearchRecommendations(
          processedMessages.messages,
          validatedArgs,
          result.analytics
        );
      }

      logger.logToolExecution('slack_search_messages', validatedArgs, Date.now() - startTime);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_search_messages', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_search_messages',
        args,
        execution_time_ms: duration,
        api_calls_made: apiCallCount,
      }) as SearchResult;
    }
  },
};

async function buildSearchQuery(args: InputArgs): Promise<string> {
  let query = args.query;

  // Add channel filters
  if (args.channel_filter && args.channel_filter.length > 0) {
    const channelQueries = args.channel_filter.map(channel => {
      // Handle both channel names and IDs
      if (channel.startsWith('#')) {
        return `in:${channel}`;
      } else if (channel.startsWith('C')) {
        return `in:<#${channel}>`;
      } else {
        return `in:#${channel}`;
      }
    });
    query += ` (${channelQueries.join(' OR ')})`;
  }

  // Add user filters
  if (args.user_filter && args.user_filter.length > 0) {
    const userQueries = args.user_filter.map(user => {
      if (user.startsWith('@')) {
        return `from:${user}`;
      } else if (user.startsWith('U')) {
        return `from:<@${user}>`;
      } else {
        return `from:@${user}`;
      }
    });
    query += ` (${userQueries.join(' OR ')})`;
  }

  // Add date range filters
  if (args.date_range) {
    if (args.date_range.after) {
      query += ` after:${args.date_range.after}`;
    }
    if (args.date_range.before) {
      query += ` before:${args.date_range.before}`;
    }
  }

  // Add content filters
  if (args.has_files) {
    query += ' has:file';
  }
  if (args.has_links) {
    query += ' has:link';
  }
  if (args.has_reactions) {
    query += ' has:reaction';
  }

  return query.trim();
}

async function processSearchResults(
  matches: any[],
  args: InputArgs,
  initialApiCallCount: number
) {
  let apiCallCount = initialApiCallCount;
  const processedMessages = [];

  for (const match of matches) {
    try {
      const message = match;
      const processedMessage: any = {
        channel: message.channel?.id || 'unknown',
        channel_name: message.channel?.name,
        user: message.user || 'unknown',
        username: message.username,
        timestamp: message.ts,
        text: message.text || '',
        score: match.score,
        metadata: {
          has_files: !!(message.files && message.files.length > 0),
          has_links: !!(message.text && message.text.includes('http')),
          has_reactions: !!(message.reactions && message.reactions.length > 0),
          reaction_count: message.reactions 
            ? message.reactions.reduce((sum: number, r: any) => sum + r.count, 0) 
            : 0,
          reply_count: message.reply_count || 0,
          thread_ts: message.thread_ts,
        },
      };

      // Add highlighted text if requested
      if (args.highlight_matches) {
        processedMessage.highlighted_text = highlightSearchTerms(
          message.text || '',
          args.query
        );
      }

      // Add context if requested
      if (args.include_context && message.channel?.id) {
        try {
          const context = await getMessageContext(
            message.channel.id,
            message.ts,
            args.context_size || 2
          );
          processedMessage.context = context;
          apiCallCount += 2; // Before and after context calls
        } catch (error: any) {
          logger.warn('Failed to get message context', { error: error.message });
        }
      }

      processedMessages.push(processedMessage);
    } catch (error: any) {
      logger.warn('Failed to process search result', { error: error.message });
    }
  }

  return { messages: processedMessages, apiCallCount };
}

async function getMessageContext(channelId: string, timestamp: string, contextSize: number) {
  const context: { before: any[]; after: any[] } = { before: [], after: [] };

  try {
    // Get messages before
    const beforeResponse = await (slackClient as any).client.conversations.history({
      channel: channelId,
      latest: timestamp,
      limit: contextSize + 1,
    });

    if (beforeResponse.ok && beforeResponse.messages) {
      context.before = beforeResponse.messages.slice(0, contextSize).reverse();
    }

    // Get messages after
    const afterResponse = await (slackClient as any).client.conversations.history({
      channel: channelId,
      oldest: timestamp,
      limit: contextSize + 1,
    });

    if (afterResponse.ok && afterResponse.messages) {
      context.after = afterResponse.messages.slice(-contextSize);
    }
  } catch (error: any) {
    logger.warn('Failed to fetch message context', { error: error.message });
  }

  return context;
}

function highlightSearchTerms(text: string, query: string): string {
  // Simple highlighting - in a real implementation, you'd want more sophisticated term extraction
  const terms = query.split(' ').filter(term => 
    !term.startsWith('in:') && 
    !term.startsWith('from:') && 
    !term.startsWith('after:') && 
    !term.startsWith('before:') &&
    !term.startsWith('has:') &&
    term.length > 2
  );

  let highlightedText = text;
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlightedText = highlightedText.replace(regex, '**$1**');
  });

  return highlightedText;
}

function buildContentFilters(args: InputArgs): string[] {
  const filters = [];
  
  if (args.has_files) filters.push('has_files');
  if (args.has_links) filters.push('has_links');
  if (args.has_reactions) filters.push('has_reactions');
  if (args.message_type && args.message_type !== 'all') filters.push(`type_${args.message_type}`);
  
  return filters;
}

function generateSearchAnalytics(messages: any[], args: InputArgs, searchResults: any) {
  // Analyze query complexity
  const queryTerms = args.query.split(' ').length;
  const hasFilters = !!(args.channel_filter?.length || args.user_filter?.length || args.date_range);
  const queryComplexity = queryTerms > 5 || hasFilters ? 'complex' : queryTerms > 2 ? 'moderate' : 'simple';

  // Match distribution by channel
  const channelDistribution: Record<string, number> = {};
  messages.forEach(msg => {
    const channelName = msg.channel_name || msg.channel;
    channelDistribution[channelName] = (channelDistribution[channelName] || 0) + 1;
  });

  // Temporal patterns
  const messagesByHour: Record<number, number> = {};
  messages.forEach(msg => {
    const hour = new Date(parseFloat(msg.timestamp) * 1000).getHours();
    messagesByHour[hour] = (messagesByHour[hour] || 0) + 1;
  });

  const peakHours = Object.entries(messagesByHour)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => `${hour}:00`);

  // User activity analysis
  const userActivity: Record<string, number> = {};
  messages.forEach(msg => {
    const username = msg.username || msg.user;
    userActivity[username] = (userActivity[username] || 0) + 1;
  });

  const mostActiveUsers = Object.entries(userActivity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([user, count]) => ({ user, message_count: count }));

  const mostActiveChannels = Object.entries(channelDistribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([channel, count]) => ({ channel, message_count: count }));

  // Content type analysis
  const contentTypes = {
    text_only: messages.filter(m => !m.metadata.has_files && !m.metadata.has_links).length,
    with_files: messages.filter(m => m.metadata.has_files).length,
    with_links: messages.filter(m => m.metadata.has_links).length,
    with_reactions: messages.filter(m => m.metadata.has_reactions).length,
  };

  // Engagement metrics
  const totalReactions = messages.reduce((sum, m) => sum + m.metadata.reaction_count, 0);
  const totalReplies = messages.reduce((sum, m) => sum + m.metadata.reply_count, 0);
  const avgReactions = messages.length > 0 ? totalReactions / messages.length : 0;
  const avgReplies = messages.length > 0 ? totalReplies / messages.length : 0;

  const engagementScore = Math.min((avgReactions * 10 + avgReplies * 5), 100);

  // Viral content indicators
  const viralIndicators = [];
  if (avgReactions > 5) viralIndicators.push('high_reaction_rate');
  if (avgReplies > 3) viralIndicators.push('high_reply_rate');
  if (messages.some(m => m.metadata.reaction_count > 20)) viralIndicators.push('viral_messages_present');

  return {
    search_insights: {
      query_complexity: queryComplexity,
      match_distribution: channelDistribution,
      temporal_patterns: {
        peak_activity_periods: peakHours,
        message_frequency: messages.length > 50 ? 'high' : messages.length > 20 ? 'medium' : 'low',
        date_range_coverage: args.date_range ? 'filtered' : 'full_history',
      },
    },
    content_analysis: {
      most_active_users: mostActiveUsers,
      most_active_channels: mostActiveChannels,
      content_types: contentTypes,
    },
    engagement_metrics: {
      average_reactions_per_message: Math.round(avgReactions * 100) / 100,
      average_replies_per_message: Math.round(avgReplies * 100) / 100,
      engagement_score: Math.round(engagementScore),
      viral_content_indicators: viralIndicators,
    },
  };
}

function generateSearchRecommendations(messages: any[], args: InputArgs, analytics: any) {
  const recommendations = {
    search_refinements: [] as string[],
    related_queries: [] as string[],
    workflow_tips: [] as string[],
  };

  // Search refinements based on results
  if (messages.length === 0) {
    recommendations.search_refinements.push('Try broader search terms');
    recommendations.search_refinements.push('Remove date or channel filters');
    recommendations.search_refinements.push('Check spelling of search terms');
  } else if (messages.length > 50) {
    recommendations.search_refinements.push('Add date range to narrow results');
    recommendations.search_refinements.push('Filter by specific channels or users');
    recommendations.search_refinements.push('Use more specific search terms');
  }

  // Related queries based on content
  const commonTerms = extractCommonTerms(messages);
  recommendations.related_queries = commonTerms.slice(0, 3).map(term => 
    `${args.query} ${term}`
  );

  // Workflow tips
  if (analytics.engagement_metrics.engagement_score > 70) {
    recommendations.workflow_tips.push('High engagement content found - consider bookmarking important messages');
  }

  if (analytics.content_analysis.content_types.with_files > 5) {
    recommendations.workflow_tips.push('Many files found - consider organizing in shared drives');
  }

  recommendations.workflow_tips.push('Use search operators like "from:" and "in:" for precise results');
  recommendations.workflow_tips.push('Save frequently used searches as shortcuts');

  return recommendations;
}

function extractCommonTerms(messages: any[]): string[] {
  const termFrequency: Record<string, number> = {};
  
  messages.forEach(message => {
    const words = (message.text || '').toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 3 && !isCommonWord(word));
    
    words.forEach((word: string) => {
      termFrequency[word] = (termFrequency[word] || 0) + 1;
    });
  });

  return Object.entries(termFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([term]) => term);
}

function isCommonWord(word: string): boolean {
  const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'];
  return commonWords.includes(word.toLowerCase());
}
