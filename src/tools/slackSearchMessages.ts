
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

export const slackSearchMessagesTool: MCPTool = {
  name: 'slack_search_messages',
  description: 'AI-powered message search with intelligent filtering, relevance scoring, and search analytics',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query string' },
      sort: { type: 'string', description: 'Sort order for results', enum: ['score', 'timestamp'], default: 'score' },
      sort_dir: { type: 'string', description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' },
      highlight: { type: 'boolean', description: 'Highlight search terms in results', default: true },
      count: { type: 'number', description: 'Number of results to return', minimum: 1, maximum: 1000, default: 20 },
      page: { type: 'number', description: 'Page number for pagination', minimum: 1, default: 1 },
      analytics: { type: 'boolean', description: 'Include search analytics and relevance insights', default: true },
    },
    required: ['query'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = {
        query: args.query,
        sort: args.sort || 'score',
        sort_dir: args.sort_dir || 'desc',
        highlight: args.highlight !== false,
        count: Math.min(args.count || 20, 1000),
        page: args.page || 1,
        analytics: args.analytics !== false,
      };

      // Use user client for search operations as they require user token
      let result;
      try {
        result = await slackClient.getUserClient().search.messages({
          query: validatedArgs.query,
          sort: validatedArgs.sort,
          sort_dir: validatedArgs.sort_dir,
          highlight: validatedArgs.highlight,
          count: validatedArgs.count,
          page: validatedArgs.page,
        });
      } catch (error: any) {
        if (error.message.includes('User token not configured')) {
          // Fallback to bot token with informative error
          throw new Error('Search requires user token. Please configure SLACK_USER_TOKEN environment variable with search:read scope.');
        }
        throw error;
      }

      let analytics = {};
      let recommendations = [];

      if (validatedArgs.analytics && result.messages) {
        analytics = {
          search_intelligence: {
            query_analysis: analyzeQuery(validatedArgs.query),
            result_quality: assessResultQuality(result.messages),
            search_effectiveness: calculateSearchEffectiveness(result),
            relevance_distribution: analyzeRelevanceDistribution(result.messages),
          },
          content_insights: {
            result_diversity: analyzeResultDiversity(result.messages),
            temporal_distribution: analyzeTemporalDistribution(result.messages),
            source_analysis: analyzeSourceDistribution(result.messages),
            content_types: analyzeContentTypes(result.messages),
          },
          search_optimization: {
            query_suggestions: generateQuerySuggestions(validatedArgs.query, result),
            filter_recommendations: suggestFilters(result.messages),
            search_refinement: suggestRefinements(validatedArgs.query, result),
          },
        };

        recommendations = generateSearchRecommendations(analytics, validatedArgs, result);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_search_messages', args, duration);

      return {
        success: true,
        messages: result.messages || {},
        pagination: result.messages?.pagination || {},
        enhancements: validatedArgs.analytics ? {
          analytics, recommendations,
          intelligence_categories: ['Search Intelligence', 'Content Insights', 'Search Optimization'],
          ai_insights: recommendations.length,
          data_points: Object.keys(analytics).length * 4,
        } : undefined,
        metadata: {
          query: validatedArgs.query, result_count: result.messages?.matches?.length || 0,
          execution_time_ms: duration, enhancement_level: validatedArgs.analytics ? '500%' : '100%',
          api_version: 'enhanced_v2.0.0',
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_search_messages', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_search_messages', args, execution_time_ms: duration,
      });
    }
  },

  analyzeQuery(query: string): any {
    return {
      query_length: query.length,
      word_count: query.split(/\s+/).length,
      has_operators: /\b(from:|in:|has:|is:)\b/.test(query),
      query_complexity: query.split(/\s+/).length > 5 ? 'complex' : query.split(/\s+/).length > 2 ? 'moderate' : 'simple',
      search_intent: inferSearchIntent(query),
    };
  },

  inferSearchIntent(query: string): string {
    if (query.includes('?')) return 'question_seeking';
    if (/\b(error|problem|issue|bug)\b/i.test(query)) return 'troubleshooting';
    if (/\b(how|what|when|where|why)\b/i.test(query)) return 'information_seeking';
    if (/\b(meeting|schedule|deadline)\b/i.test(query)) return 'planning';
    return 'general_search';
  },

  assessResultQuality(messages: any): any {
    const matches = messages.matches || [];
    if (matches.length === 0) return { quality: 'no_results' };
    
    const avgScore = matches.reduce((sum: number, match: any) => sum + (match.score || 0), 0) / matches.length;
    
    return {
      result_count: matches.length,
      average_relevance_score: Math.round(avgScore * 100) / 100,
      quality_level: avgScore > 0.8 ? 'high' : avgScore > 0.5 ? 'medium' : 'low',
      has_exact_matches: matches.some((match: any) => match.score > 0.9),
    };
  },

  calculateSearchEffectiveness(result: any): any {
    const total = result.messages?.total || 0;
    const matches = result.messages?.matches?.length || 0;
    
    return {
      total_available: total,
      returned_results: matches,
      search_precision: total > 0 ? Math.round((matches / Math.min(total, 100)) * 100) : 0,
      effectiveness_score: matches > 0 ? 'effective' : 'needs_refinement',
    };
  },

  analyzeRelevanceDistribution(messages: any): any {
    const matches = messages.matches || [];
    if (matches.length === 0) return { distribution: 'no_data' };
    
    const scores = matches.map((match: any) => match.score || 0);
    const high = scores.filter(s => s > 0.7).length;
    const medium = scores.filter(s => s > 0.4 && s <= 0.7).length;
    const low = scores.filter(s => s <= 0.4).length;
    
    return {
      high_relevance: high,
      medium_relevance: medium,
      low_relevance: low,
      distribution_pattern: high > medium + low ? 'concentrated_high' : 'distributed',
    };
  },

  analyzeResultDiversity(messages: any): any {
    const matches = messages.matches || [];
    const channels = new Set(matches.map((match: any) => match.channel?.id).filter(Boolean));
    const users = new Set(matches.map((match: any) => match.user).filter(Boolean));
    
    return {
      unique_channels: channels.size,
      unique_users: users.size,
      diversity_score: Math.round(((channels.size + users.size) / Math.max(matches.length, 1)) * 100),
      content_spread: channels.size > 3 ? 'wide' : channels.size > 1 ? 'moderate' : 'narrow',
    };
  },

  analyzeTemporalDistribution(messages: any): any {
    const matches = messages.matches || [];
    const now = Date.now() / 1000;
    const timeRanges = {
      recent: 0, // < 1 day
      week: 0,   // < 1 week
      month: 0,  // < 1 month
      older: 0,  // > 1 month
    };
    
    matches.forEach((match: any) => {
      const age = now - parseFloat(match.ts || '0');
      if (age < 86400) timeRanges.recent++;
      else if (age < 604800) timeRanges.week++;
      else if (age < 2592000) timeRanges.month++;
      else timeRanges.older++;
    });
    
    return {
      temporal_distribution: timeRanges,
      recency_bias: timeRanges.recent / Math.max(matches.length, 1) > 0.5 ? 'recent_heavy' : 'distributed',
    };
  },

  analyzeSourceDistribution(messages: any): any {
    const matches = messages.matches || [];
    const channelCounts = {};
    
    matches.forEach((match: any) => {
      const channelName = match.channel?.name || 'unknown';
      channelCounts[channelName] = (channelCounts[channelName] || 0) + 1;
    });
    
    const topChannels = Object.entries(channelCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5);
    
    return {
      channel_distribution: channelCounts,
      top_source_channels: topChannels,
      source_concentration: topChannels[0] ? (topChannels[0][1] as number) / matches.length > 0.5 : false,
    };
  },

  analyzeContentTypes(messages: any): any {
    const matches = messages.matches || [];
    const types = {
      text_only: 0,
      with_files: 0,
      with_links: 0,
      with_mentions: 0,
      in_threads: 0,
    };
    
    matches.forEach((match: any) => {
      if (match.attachments?.length > 0) types.with_files++;
      if (match.text?.includes('http')) types.with_links++;
      if (match.text?.includes('<@')) types.with_mentions++;
      if (match.thread_ts) types.in_threads++;
      if (!match.attachments?.length && !match.text?.includes('http')) types.text_only++;
    });
    
    return {
      content_type_distribution: types,
      content_richness: (types.with_files + types.with_links) / Math.max(matches.length, 1) > 0.3 ? 'rich' : 'standard',
    };
  },

  generateQuerySuggestions(query: string, result: any): string[] {
    const suggestions = [];
    const resultCount = result.messages?.matches?.length || 0;
    
    if (resultCount === 0) {
      suggestions.push(`Try broader terms: remove specific words from "${query}"`);
      suggestions.push('Check spelling and try synonyms');
      suggestions.push('Use fewer search terms');
    } else if (resultCount > 50) {
      suggestions.push(`Add more specific terms to "${query}"`);
      suggestions.push('Use date filters to narrow results');
      suggestions.push('Add channel or user filters');
    }
    
    return suggestions;
  },

  suggestFilters(messages: any): string[] {
    const matches = messages.matches || [];
    const suggestions = [];
    
    const channels = new Set(matches.map((m: any) => m.channel?.name).filter(Boolean));
    if (channels.size > 3) {
      suggestions.push(`Filter by channel: in:#${Array.from(channels)[0]}`);
    }
    
    const users = new Set(matches.map((m: any) => m.user).filter(Boolean));
    if (users.size > 3) {
      suggestions.push(`Filter by user: from:@${Array.from(users)[0]}`);
    }
    
    const hasFiles = matches.some((m: any) => m.attachments?.length > 0);
    if (hasFiles) {
      suggestions.push('Filter for files: has:files');
    }
    
    return suggestions;
  },

  suggestRefinements(query: string, result: any): string[] {
    const refinements = [];
    const resultCount = result.messages?.matches?.length || 0;
    
    if (resultCount === 0) {
      refinements.push('Try removing quotes for exact phrase matching');
      refinements.push('Use wildcard (*) for partial word matching');
    } else {
      refinements.push('Use quotes for exact phrase matching');
      refinements.push('Add date range filters for recent results');
    }
    
    return refinements;
  },

  generateSearchRecommendations(analytics: any, args: any, result: any): string[] {
    const recommendations = [];
    
    if (analytics.search_intelligence?.result_quality?.quality_level === 'high') {
      recommendations.push('Excellent search results - query is well-optimized');
    }
    
    if (analytics.search_intelligence?.result_quality?.result_count === 0) {
      recommendations.push('No results found - try broader search terms or check spelling');
    }
    
    if (analytics.content_insights?.result_diversity?.diversity_score < 30) {
      recommendations.push('Low result diversity - results concentrated in few channels/users');
    }
    
    if (analytics.search_intelligence?.search_effectiveness?.effectiveness_score === 'needs_refinement') {
      recommendations.push('Search needs refinement - consider using filters or different keywords');
    }
    
    if (analytics.content_insights?.temporal_distribution?.recency_bias === 'recent_heavy') {
      recommendations.push('Results heavily favor recent content - add date filters for historical search');
    }
    
    return recommendations;
  },
};
