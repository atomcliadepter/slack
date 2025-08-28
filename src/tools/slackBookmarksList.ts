import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  include_analytics: z.boolean().optional().default(true),
  analyze_usage_patterns: z.boolean().optional().default(true),
  validate_links: z.boolean().optional().default(false),
  generate_recommendations: z.boolean().optional().default(true),
  sort_by: z.enum(['date_created', 'title', 'type', 'usage']).optional().default('date_created'),
  sort_direction: z.enum(['asc', 'desc']).optional().default('desc'),
});

type InputArgs = z.infer<typeof inputSchema>;

interface BookmarkItem {
  id: string;
  title: string;
  type: string;
  url?: string;
  emoji?: string;
  date_created: string;
  created_by: string;
  last_updated?: string;
  updated_by?: string;
  metadata: {
    age_days: number;
    link_status?: 'valid' | 'invalid' | 'unknown';
    category: string;
    importance_score: number;
  };
  usage_analytics?: {
    estimated_usage: string;
    accessibility_score: number;
    relevance_score: number;
  };
}

interface BookmarksListResult {
  success: boolean;
  channel: string;
  channel_name?: string;
  total_bookmarks: number;
  bookmarks: BookmarkItem[];
  analytics?: {
    bookmark_distribution: {
      by_type: Record<string, number>;
      by_creator: Record<string, number>;
      by_age_range: Record<string, number>;
      by_category: Record<string, number>;
    };
    usage_patterns: {
      average_bookmark_age_days: number;
      bookmark_density: string;
      content_freshness: string;
      organizational_efficiency: string;
    };
    link_health: {
      total_links: number;
      valid_links: number;
      invalid_links: number;
      unknown_status: number;
      health_percentage: number;
    };
    accessibility_analysis: {
      average_accessibility_score: number;
      well_organized_bookmarks: number;
      needs_improvement: number;
      accessibility_rating: string;
    };
  };
  recommendations?: {
    bookmark_management: string[];
    organization_improvements: string[];
    accessibility_enhancements: string[];
    workflow_optimizations: string[];
  };
  metadata: {
    execution_time_ms: number;
    api_calls_made: number;
    analysis_timestamp: string;
    sort_applied: string;
    link_validation_performed: boolean;
  };
}

export const slackBookmarksListTool: MCPTool = {
  name: 'slack_bookmarks_list',
  description: 'List and analyze channel bookmarks with comprehensive management insights',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name to list bookmarks from',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Whether to include detailed bookmark analytics',
        default: true,
      },
      analyze_usage_patterns: {
        type: 'boolean',
        description: 'Whether to analyze bookmark usage patterns',
        default: true,
      },
      validate_links: {
        type: 'boolean',
        description: 'Whether to validate bookmark links (may increase execution time)',
        default: false,
      },
      generate_recommendations: {
        type: 'boolean',
        description: 'Whether to generate management recommendations',
        default: true,
      },
      sort_by: {
        type: 'string',
        enum: ['date_created', 'title', 'type', 'usage'],
        description: 'How to sort the bookmarks',
        default: 'date_created',
      },
      sort_direction: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort direction',
        default: 'desc',
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>): Promise<BookmarksListResult> {
    const startTime = Date.now();
    let apiCallCount = 0;

    try {
      const validatedArgs = Validator.validate(inputSchema, args) as InputArgs;
      
      // Resolve channel ID if needed
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      apiCallCount++;

      // Get channel info for name
      let channelName: string | undefined;
      try {
        const channelInfo = await (slackClient as any).client.conversations.info({
          channel: channelId,
        });
        apiCallCount++;
        
        if (channelInfo.ok && channelInfo.channel) {
          channelName = channelInfo.channel.name;
        }
      } catch (error: any) {
        logger.warn('Could not fetch channel info', { error: error.message });
      }

      // Get bookmarks list
      const bookmarksResponse = await (slackClient as any).client.bookmarks.list({
        channel_id: channelId,
      });
      apiCallCount++;

      if (!bookmarksResponse.ok) {
        throw new Error(`Failed to get bookmarks: ${bookmarksResponse.error}`);
      }

      const bookmarks = bookmarksResponse.bookmarks || [];
      const processedBookmarks: BookmarkItem[] = [];

      // Process each bookmark
      for (const bookmark of bookmarks) {
        const createdDate = new Date(bookmark.date_created * 1000);
        const ageDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

        // Categorize bookmark
        const category = categorizeBookmark(bookmark);
        
        // Calculate importance score
        const importanceScore = calculateBookmarkImportance(bookmark, ageDays);

        const bookmarkItem: BookmarkItem = {
          id: bookmark.id,
          title: bookmark.title || 'Untitled Bookmark',
          type: bookmark.type || 'link',
          url: bookmark.link,
          emoji: bookmark.emoji,
          date_created: createdDate.toISOString(),
          created_by: bookmark.owner,
          last_updated: bookmark.date_updated ? new Date(bookmark.date_updated * 1000).toISOString() : undefined,
          updated_by: bookmark.last_updated_by,
          metadata: {
            age_days: Math.round(ageDays * 100) / 100,
            category: category,
            importance_score: importanceScore,
          },
        };

        // Add usage analytics if requested
        if (validatedArgs.analyze_usage_patterns) {
          bookmarkItem.usage_analytics = analyzeBookmarkUsage(bookmark, ageDays);
        }

        // Validate link if requested
        if (validatedArgs.validate_links && bookmark.link) {
          bookmarkItem.metadata.link_status = await validateLink(bookmark.link);
        }

        processedBookmarks.push(bookmarkItem);
      }

      // Sort bookmarks
      sortBookmarks(processedBookmarks, validatedArgs.sort_by, validatedArgs.sort_direction);

      // Build result
      const result: BookmarksListResult = {
        success: true,
        channel: channelId,
        channel_name: channelName,
        total_bookmarks: processedBookmarks.length,
        bookmarks: processedBookmarks,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          api_calls_made: apiCallCount,
          analysis_timestamp: new Date().toISOString(),
          sort_applied: `${validatedArgs.sort_by}_${validatedArgs.sort_direction}`,
          link_validation_performed: validatedArgs.validate_links,
        },
      };

      // Add analytics if requested
      if (validatedArgs.include_analytics) {
        result.analytics = generateBookmarkAnalytics(processedBookmarks);
      }

      // Add recommendations if requested
      if (validatedArgs.generate_recommendations) {
        result.recommendations = generateBookmarkRecommendations(
          processedBookmarks,
          result.analytics
        );
      }

      logger.logToolExecution('slack_bookmarks_list', validatedArgs, Date.now() - startTime);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_bookmarks_list', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_bookmarks_list',
        args,
        execution_time_ms: duration,
        api_calls_made: apiCallCount,
      }) as BookmarksListResult;
    }
  },
};

function categorizeBookmark(bookmark: any): string {
  const title = (bookmark.title || '').toLowerCase();
  const url = (bookmark.link || '').toLowerCase();

  // Documentation
  if (title.includes('doc') || title.includes('guide') || title.includes('manual') || 
      url.includes('docs.') || url.includes('documentation')) {
    return 'documentation';
  }

  // Tools and applications
  if (title.includes('tool') || title.includes('app') || title.includes('dashboard') ||
      url.includes('app.') || url.includes('dashboard')) {
    return 'tools';
  }

  // Meeting and calendar
  if (title.includes('meeting') || title.includes('calendar') || title.includes('zoom') ||
      url.includes('zoom.') || url.includes('calendar') || url.includes('meet.')) {
    return 'meetings';
  }

  // Resources and references
  if (title.includes('resource') || title.includes('reference') || title.includes('wiki') ||
      url.includes('wiki') || url.includes('confluence')) {
    return 'resources';
  }

  // Project management
  if (title.includes('project') || title.includes('task') || title.includes('jira') ||
      url.includes('jira') || url.includes('trello') || url.includes('asana')) {
    return 'project_management';
  }

  // Code repositories
  if (url.includes('github.') || url.includes('gitlab.') || url.includes('bitbucket.')) {
    return 'code_repository';
  }

  return 'general';
}

function calculateBookmarkImportance(bookmark: any, ageDays: number): number {
  let score = 0;

  // Recency factor
  if (ageDays < 7) score += 25;
  else if (ageDays < 30) score += 20;
  else if (ageDays < 90) score += 15;
  else if (ageDays < 365) score += 10;

  // Title quality factor
  const title = bookmark.title || '';
  if (title.length > 10) score += 15;
  if (title.length > 20) score += 10;

  // URL quality factor
  const url = bookmark.link || '';
  if (url.includes('https://')) score += 10;
  if (url.includes('docs.') || url.includes('wiki') || url.includes('confluence')) score += 15;

  // Emoji factor (indicates curation)
  if (bookmark.emoji) score += 10;

  // Type factor
  if (bookmark.type === 'link') score += 5;

  // Update factor
  if (bookmark.date_updated && bookmark.date_updated > bookmark.date_created) {
    score += 15;
  }

  return Math.min(score, 100);
}

function analyzeBookmarkUsage(bookmark: any, ageDays: number) {
  // Estimate usage based on various factors
  let usageScore = 0;
  
  // Age factor (newer bookmarks might be used more)
  if (ageDays < 30) usageScore += 30;
  else if (ageDays < 90) usageScore += 20;
  else if (ageDays < 365) usageScore += 10;

  // Category factor
  const category = categorizeBookmark(bookmark);
  if (['tools', 'documentation', 'project_management'].includes(category)) {
    usageScore += 25;
  } else if (['meetings', 'resources'].includes(category)) {
    usageScore += 15;
  }

  // Title quality factor
  const title = bookmark.title || '';
  if (title.length > 20 && title.includes(' ')) usageScore += 15;

  let estimatedUsage = 'low';
  if (usageScore > 60) estimatedUsage = 'high';
  else if (usageScore > 40) estimatedUsage = 'medium';

  // Accessibility score
  let accessibilityScore = 50;
  if (bookmark.emoji) accessibilityScore += 20;
  if (title.length > 10) accessibilityScore += 15;
  if (bookmark.link && bookmark.link.includes('https://')) accessibilityScore += 15;

  // Relevance score
  let relevanceScore = 50;
  if (ageDays < 90) relevanceScore += 30;
  else if (ageDays < 365) relevanceScore += 15;
  
  if (bookmark.date_updated && bookmark.date_updated > bookmark.date_created) {
    relevanceScore += 20;
  }

  return {
    estimated_usage: estimatedUsage,
    accessibility_score: Math.min(accessibilityScore, 100),
    relevance_score: Math.min(relevanceScore, 100),
  };
}

async function validateLink(url: string): Promise<'valid' | 'invalid' | 'unknown'> {
  try {
    // Simple URL validation (in a real implementation, you might make HTTP requests)
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) {
      return 'invalid';
    }

    // Check for common invalid patterns
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'invalid';
    }

    // For now, assume valid if it passes basic checks
    return 'valid';
  } catch (error) {
    return 'unknown';
  }
}

function sortBookmarks(bookmarks: BookmarkItem[], sortBy: string, direction: string) {
  bookmarks.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date_created':
        comparison = new Date(a.date_created).getTime() - new Date(b.date_created).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'usage':
        const aUsage = a.usage_analytics?.accessibility_score || 0;
        const bUsage = b.usage_analytics?.accessibility_score || 0;
        comparison = aUsage - bUsage;
        break;
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

function generateBookmarkAnalytics(bookmarks: BookmarkItem[]) {
  if (bookmarks.length === 0) {
    return {
      bookmark_distribution: { by_type: {}, by_creator: {}, by_age_range: {}, by_category: {} },
      usage_patterns: {
        average_bookmark_age_days: 0,
        bookmark_density: 'none',
        content_freshness: 'none',
        organizational_efficiency: 'poor',
      },
      link_health: {
        total_links: 0,
        valid_links: 0,
        invalid_links: 0,
        unknown_status: 0,
        health_percentage: 0,
      },
      accessibility_analysis: {
        average_accessibility_score: 0,
        well_organized_bookmarks: 0,
        needs_improvement: 0,
        accessibility_rating: 'poor',
      },
    };
  }

  // Distribution analysis
  const byType: Record<string, number> = {};
  const byCreator: Record<string, number> = {};
  const byAgeRange: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  bookmarks.forEach(bookmark => {
    // By type
    byType[bookmark.type] = (byType[bookmark.type] || 0) + 1;

    // By creator
    byCreator[bookmark.created_by] = (byCreator[bookmark.created_by] || 0) + 1;

    // By age range
    const ageDays = bookmark.metadata.age_days;
    let ageRange = 'very_old';
    if (ageDays < 7) ageRange = 'this_week';
    else if (ageDays < 30) ageRange = 'this_month';
    else if (ageDays < 90) ageRange = 'this_quarter';
    else if (ageDays < 365) ageRange = 'this_year';

    byAgeRange[ageRange] = (byAgeRange[ageRange] || 0) + 1;

    // By category
    const category = bookmark.metadata.category;
    byCategory[category] = (byCategory[category] || 0) + 1;
  });

  // Usage patterns
  const totalAgeDays = bookmarks.reduce((sum, bookmark) => sum + bookmark.metadata.age_days, 0);
  const averageBookmarkAgeDays = totalAgeDays / bookmarks.length;

  let bookmarkDensity = 'low';
  if (bookmarks.length > 20) bookmarkDensity = 'very_high';
  else if (bookmarks.length > 15) bookmarkDensity = 'high';
  else if (bookmarks.length > 10) bookmarkDensity = 'medium';

  const recentBookmarks = bookmarks.filter(bookmark => bookmark.metadata.age_days < 30).length;
  const freshnessRatio = recentBookmarks / bookmarks.length;
  let contentFreshness = 'stale';
  if (freshnessRatio > 0.5) contentFreshness = 'fresh';
  else if (freshnessRatio > 0.3) contentFreshness = 'moderate';

  let organizationalEfficiency = 'poor';
  if (bookmarkDensity !== 'very_high' && contentFreshness !== 'stale') organizationalEfficiency = 'excellent';
  else if (bookmarkDensity === 'medium' || contentFreshness === 'moderate') organizationalEfficiency = 'good';
  else if (bookmarkDensity === 'high' || contentFreshness === 'fresh') organizationalEfficiency = 'fair';

  // Link health analysis
  const linkStatuses = bookmarks.map(b => b.metadata.link_status).filter(Boolean);
  const validLinks = linkStatuses.filter(status => status === 'valid').length;
  const invalidLinks = linkStatuses.filter(status => status === 'invalid').length;
  const unknownStatus = linkStatuses.filter(status => status === 'unknown').length;
  const healthPercentage = linkStatuses.length > 0 ? (validLinks / linkStatuses.length) * 100 : 0;

  // Accessibility analysis
  const accessibilityScores = bookmarks
    .filter(b => b.usage_analytics?.accessibility_score)
    .map(b => b.usage_analytics!.accessibility_score);
  
  const averageAccessibilityScore = accessibilityScores.length > 0
    ? accessibilityScores.reduce((sum, score) => sum + score, 0) / accessibilityScores.length
    : 0;

  const wellOrganized = bookmarks.filter(b => 
    (b.usage_analytics?.accessibility_score || 0) > 70
  ).length;
  
  const needsImprovement = bookmarks.filter(b => 
    (b.usage_analytics?.accessibility_score || 0) < 50
  ).length;

  let accessibilityRating = 'poor';
  if (averageAccessibilityScore > 80) accessibilityRating = 'excellent';
  else if (averageAccessibilityScore > 60) accessibilityRating = 'good';
  else if (averageAccessibilityScore > 40) accessibilityRating = 'fair';

  return {
    bookmark_distribution: {
      by_type: byType,
      by_creator: byCreator,
      by_age_range: byAgeRange,
      by_category: byCategory,
    },
    usage_patterns: {
      average_bookmark_age_days: Math.round(averageBookmarkAgeDays * 100) / 100,
      bookmark_density: bookmarkDensity,
      content_freshness: contentFreshness,
      organizational_efficiency: organizationalEfficiency,
    },
    link_health: {
      total_links: linkStatuses.length,
      valid_links: validLinks,
      invalid_links: invalidLinks,
      unknown_status: unknownStatus,
      health_percentage: Math.round(healthPercentage),
    },
    accessibility_analysis: {
      average_accessibility_score: Math.round(averageAccessibilityScore),
      well_organized_bookmarks: wellOrganized,
      needs_improvement: needsImprovement,
      accessibility_rating: accessibilityRating,
    },
  };
}

function generateBookmarkRecommendations(bookmarks: BookmarkItem[], analytics: any) {
  const recommendations = {
    bookmark_management: [] as string[],
    organization_improvements: [] as string[],
    accessibility_enhancements: [] as string[],
    workflow_optimizations: [] as string[],
  };

  if (!analytics) return recommendations;

  // Bookmark management recommendations
  if (analytics.usage_patterns.bookmark_density === 'very_high') {
    recommendations.bookmark_management.push('Consider removing outdated bookmarks to reduce clutter');
    recommendations.bookmark_management.push('Review bookmarks older than 6 months for relevance');
  } else if (analytics.usage_patterns.bookmark_density === 'low') {
    recommendations.bookmark_management.push('Add more essential resources as bookmarks for quick access');
  }

  if (analytics.usage_patterns.content_freshness === 'stale') {
    recommendations.bookmark_management.push('Update or replace outdated bookmarks with current resources');
    recommendations.bookmark_management.push('Establish a regular bookmark review schedule');
  }

  // Organization improvements
  if (analytics.accessibility_analysis.accessibility_rating === 'poor') {
    recommendations.organization_improvements.push('Improve bookmark titles for better clarity and searchability');
    recommendations.organization_improvements.push('Add emojis to bookmarks for visual organization');
  }

  if (Object.keys(analytics.bookmark_distribution.by_category).length > 5) {
    recommendations.organization_improvements.push('Consider grouping related bookmarks by category');
    recommendations.organization_improvements.push('Use consistent naming conventions for similar resources');
  }

  // Accessibility enhancements
  if (analytics.accessibility_analysis.needs_improvement > bookmarks.length * 0.3) {
    recommendations.accessibility_enhancements.push('Improve bookmark descriptions and titles for better discoverability');
    recommendations.accessibility_enhancements.push('Ensure all bookmark links are valid and accessible');
  }

  if (analytics.link_health.health_percentage < 80) {
    recommendations.accessibility_enhancements.push('Review and fix broken or invalid bookmark links');
    recommendations.accessibility_enhancements.push('Implement regular link validation checks');
  }

  // Workflow optimizations
  recommendations.workflow_optimizations.push('Use bookmarks for frequently accessed resources instead of searching');
  recommendations.workflow_optimizations.push('Consider creating bookmark categories for different workflows');
  
  if (bookmarks.length > 15) {
    recommendations.workflow_optimizations.push('Create a bookmark index or organize by priority for easier navigation');
  }

  if (analytics.bookmark_distribution.by_creator && Object.keys(analytics.bookmark_distribution.by_creator).length === 1) {
    recommendations.workflow_optimizations.push('Encourage team members to contribute useful bookmarks');
  }

  return recommendations;
}
