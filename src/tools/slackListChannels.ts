import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Enhanced input validation schema
const inputSchema = z.object({
  types: z.array(z.enum(['public_channel', 'private_channel', 'mpim', 'im'])).optional().default(['public_channel', 'private_channel']),
  limit: z.number().min(1).max(1000).optional().default(100),
  cursor: z.string().optional(),
  exclude_archived: z.boolean().optional().default(true),
  team_id: z.string().optional(),
  filter_by_name: z.string().optional(),
  filter_by_purpose: z.string().optional(),
  filter_by_topic: z.string().optional(),
  include_member_count: z.boolean().optional().default(false),
  include_metadata: z.boolean().optional().default(false),
  include_analytics: z.boolean().optional().default(true),
  sort_by: z.enum(['name', 'created', 'member_count', 'last_activity']).optional().default('name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

type SlackListChannelsArgs = z.infer<typeof inputSchema>;

export const slackListChannelsTool: MCPTool = {
  name: 'slack_list_channels',
  description: 'List Slack channels with advanced filtering, sorting, and analytics capabilities',
  inputSchema: {
    type: 'object',
    properties: {
      types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['public_channel', 'private_channel', 'mpim', 'im'],
        },
        description: 'Types of conversations to include',
        default: ['public_channel', 'private_channel'],
      },
      limit: {
        type: 'number',
        description: 'Number of channels to retrieve (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving next page',
      },
      exclude_archived: {
        type: 'boolean',
        description: 'Exclude archived channels from results',
        default: true,
      },
      team_id: {
        type: 'string',
        description: 'Team ID to filter channels (for Enterprise Grid)',
      },
      filter_by_name: {
        type: 'string',
        description: 'Filter channels by name pattern (case-insensitive)',
      },
      filter_by_purpose: {
        type: 'string',
        description: 'Filter channels by purpose content (case-insensitive)',
      },
      filter_by_topic: {
        type: 'string',
        description: 'Filter channels by topic content (case-insensitive)',
      },
      include_member_count: {
        type: 'boolean',
        description: 'Include member count for each channel',
        default: false,
      },
      include_metadata: {
        type: 'boolean',
        description: 'Include additional channel metadata',
        default: false,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include channel analytics and insights',
        default: true,
      },
      sort_by: {
        type: 'string',
        enum: ['name', 'created', 'member_count', 'last_activity'],
        description: 'Field to sort channels by',
        default: 'name',
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order (ascending or descending)',
        default: 'asc',
      },
    },
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackListChannelsArgs;
      
      // Prepare API parameters
      const apiParams: any = {
        types: validatedArgs.types.join(','),
        limit: validatedArgs.limit,
        cursor: validatedArgs.cursor,
        exclude_archived: validatedArgs.exclude_archived,
        team_id: validatedArgs.team_id,
      };

      // Remove undefined values
      Object.keys(apiParams).forEach(key => {
        if (apiParams[key] === undefined) {
          delete apiParams[key];
        }
      });

      // Retrieve channels from Slack API
      const result = await slackClient.getClient().conversations.list(apiParams);

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      let channels = result.channels || [];

      // Apply client-side filters
      channels = this.applyFilters(channels, validatedArgs);

      // Enhance channels with additional data if requested
      if (validatedArgs.include_member_count || validatedArgs.include_metadata) {
        channels = await this.enhanceChannels(channels, validatedArgs);
      }

      // Sort channels
      channels = this.sortChannels(channels, validatedArgs);

      // Generate analytics if requested
      let analytics = {};
      if (validatedArgs.include_analytics) {
        analytics = this.generateChannelAnalytics(channels, validatedArgs);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_list_channels', args, duration);

      return {
        success: true,
        data: {
          channels,
          response_metadata: result.response_metadata,
          has_more: !!result.response_metadata?.next_cursor,
        },
        metadata: {
          execution_time_ms: duration,
          channel_count: channels.length,
          analytics: validatedArgs.include_analytics ? analytics : undefined,
          filters_applied: {
            name_filter: !!validatedArgs.filter_by_name,
            purpose_filter: !!validatedArgs.filter_by_purpose,
            topic_filter: !!validatedArgs.filter_by_topic,
            archived_excluded: validatedArgs.exclude_archived,
          },
          sorting: {
            sort_by: validatedArgs.sort_by,
            sort_order: validatedArgs.sort_order,
          },
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_list_channels', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_list_channels',
        args,
        execution_time_ms: duration,
      });
    }
  },

  // Helper method to apply client-side filters
  applyFilters(channels: any[], args: SlackListChannelsArgs): any[] {
    let filteredChannels = [...channels];

    // Filter by name
    if (args.filter_by_name) {
      const nameFilter = args.filter_by_name.toLowerCase();
      filteredChannels = filteredChannels.filter(channel =>
        channel.name?.toLowerCase().includes(nameFilter)
      );
    }

    // Filter by purpose
    if (args.filter_by_purpose) {
      const purposeFilter = args.filter_by_purpose.toLowerCase();
      filteredChannels = filteredChannels.filter(channel =>
        channel.purpose?.value?.toLowerCase().includes(purposeFilter)
      );
    }

    // Filter by topic
    if (args.filter_by_topic) {
      const topicFilter = args.filter_by_topic.toLowerCase();
      filteredChannels = filteredChannels.filter(channel =>
        channel.topic?.value?.toLowerCase().includes(topicFilter)
      );
    }

    return filteredChannels;
  },

  // Helper method to enhance channels with additional data
  async enhanceChannels(channels: any[], args: SlackListChannelsArgs): Promise<any[]> {
    const enhancedChannels = [];

    for (const channel of channels) {
      const enhanced = { ...channel };

      // Add member count if requested
      if (args.include_member_count && channel.id) {
        try {
          const membersResult = await slackClient.getClient().conversations.members({
            channel: channel.id,
            limit: 1,
          });
          
          if (membersResult.ok && membersResult.response_metadata) {
            // Estimate member count from pagination info
            enhanced.member_count = membersResult.response_metadata.next_cursor ? '100+' : 
              (membersResult.members?.length || 0);
          }
        } catch (error) {
          // Continue without member count if API call fails
          enhanced.member_count = 'unknown';
        }
      }

      // Add metadata if requested
      if (args.include_metadata) {
        enhanced.metadata = {
          has_topic: !!(channel.topic?.value),
          has_purpose: !!(channel.purpose?.value),
          topic_length: channel.topic?.value?.length || 0,
          purpose_length: channel.purpose?.value?.length || 0,
          is_general: channel.is_general || false,
          is_shared: channel.is_shared || false,
          is_org_shared: channel.is_org_shared || false,
          created_date: channel.created ? new Date(channel.created * 1000).toISOString() : null,
        };
      }

      enhancedChannels.push(enhanced);
    }

    return enhancedChannels;
  },

  // Helper method to sort channels
  sortChannels(channels: any[], args: SlackListChannelsArgs): any[] {
    const sortedChannels = [...channels];

    sortedChannels.sort((a, b) => {
      let aValue, bValue;

      switch (args.sort_by) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'created':
          aValue = a.created || 0;
          bValue = b.created || 0;
          break;
        case 'member_count':
          aValue = typeof a.member_count === 'number' ? a.member_count : 0;
          bValue = typeof b.member_count === 'number' ? b.member_count : 0;
          break;
        case 'last_activity':
          // Use created as proxy for last activity if not available
          aValue = a.last_read || a.created || 0;
          bValue = b.last_read || b.created || 0;
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return args.sort_order === 'desc' ? -comparison : comparison;
      }

      // Handle numeric comparison
      const comparison = aValue - bValue;
      return args.sort_order === 'desc' ? -comparison : comparison;
    });

    return sortedChannels;
  },

  // Helper method to generate channel analytics
  generateChannelAnalytics(channels: any[], args: SlackListChannelsArgs): Record<string, any> {
    const totalChannels = channels.length;
    
    if (totalChannels === 0) {
      return {
        summary: { total_channels: 0 },
        note: 'No channels found matching the criteria',
      };
    }

    // Channel type distribution
    const typeDistribution = channels.reduce((acc, channel) => {
      if (channel.is_private) {
        acc.private = (acc.private || 0) + 1;
      } else {
        acc.public = (acc.public || 0) + 1;
      }
      
      if (channel.is_archived) {
        acc.archived = (acc.archived || 0) + 1;
      }
      
      return acc;
    }, {} as Record<string, number>);

    // Content analysis
    const channelsWithTopic = channels.filter(ch => ch.topic?.value).length;
    const channelsWithPurpose = channels.filter(ch => ch.purpose?.value).length;
    const generalChannels = channels.filter(ch => ch.is_general).length;
    const sharedChannels = channels.filter(ch => ch.is_shared).length;

    // Name analysis
    const namePatterns = this.analyzeChannelNames(channels);

    // Creation time analysis
    const creationAnalysis = this.analyzeCreationTimes(channels);

    return {
      summary: {
        total_channels: totalChannels,
        type_distribution: typeDistribution,
        content_stats: {
          with_topic: channelsWithTopic,
          with_purpose: channelsWithPurpose,
          topic_rate: Math.round((channelsWithTopic / totalChannels) * 100),
          purpose_rate: Math.round((channelsWithPurpose / totalChannels) * 100),
        },
      },
      channel_characteristics: {
        general_channels: generalChannels,
        shared_channels: sharedChannels,
        name_patterns: namePatterns,
        creation_analysis: creationAnalysis,
      },
      retrieval_info: {
        requested_limit: args.limit,
        actual_retrieved: totalChannels,
        filters_applied: !!(args.filter_by_name || args.filter_by_purpose || args.filter_by_topic),
        sort_applied: `${args.sort_by} (${args.sort_order})`,
      },
      recommendations: this.generateChannelRecommendations(channels, args),
    };
  },

  // Helper method to analyze channel names
  analyzeChannelNames(channels: any[]): Record<string, any> {
    const names = channels.map(ch => ch.name).filter(Boolean);
    
    const patterns = {
      with_hyphens: names.filter(name => name.includes('-')).length,
      with_underscores: names.filter(name => name.includes('_')).length,
      with_numbers: names.filter(name => /\d/.test(name)).length,
      average_length: names.length > 0 ? Math.round(names.reduce((sum, name) => sum + name.length, 0) / names.length) : 0,
    };

    // Common prefixes
    const prefixes = names.map(name => name.split('-')[0]).reduce((acc, prefix) => {
      acc[prefix] = (acc[prefix] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonPrefixes = Object.entries(prefixes)
      .filter(([, count]) => (count as number) > 1)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([prefix, count]) => ({ prefix, count: count as number }));

    return {
      ...patterns,
      common_prefixes: commonPrefixes,
    };
  },

  // Helper method to analyze creation times
  analyzeCreationTimes(channels: any[]): Record<string, any> {
    const timestamps = channels.map(ch => ch.created).filter(Boolean);
    
    if (timestamps.length === 0) {
      return { note: 'No creation timestamps available' };
    }

    const dates = timestamps.map(ts => new Date(ts * 1000));
    const oldest = new Date(Math.min(...timestamps) * 1000);
    const newest = new Date(Math.max(...timestamps) * 1000);

    // Group by month for trend analysis
    const monthlyCreation = dates.reduce((acc, date) => {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      oldest_channel: oldest.toISOString(),
      newest_channel: newest.toISOString(),
      time_span_days: Math.round((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)),
      monthly_creation: monthlyCreation,
    };
  },

  // Helper method to generate recommendations
  generateChannelRecommendations(channels: any[], args: SlackListChannelsArgs): string[] {
    const recommendations = [];
    const totalChannels = channels.length;

    if (totalChannels === 0) {
      recommendations.push('No channels found - consider adjusting your filter criteria');
      return recommendations;
    }

    const channelsWithoutTopic = channels.filter(ch => !ch.topic?.value).length;
    const channelsWithoutPurpose = channels.filter(ch => !ch.purpose?.value).length;

    if (channelsWithoutTopic > totalChannels * 0.3) {
      recommendations.push('Consider adding topics to channels without them to improve discoverability');
    }

    if (channelsWithoutPurpose > totalChannels * 0.3) {
      recommendations.push('Adding purposes to channels helps users understand their intended use');
    }

    if (args.limit >= 100 && totalChannels === args.limit) {
      recommendations.push('You may have more channels - consider using pagination to see all results');
    }

    if (!args.include_member_count) {
      recommendations.push('Enable member count to identify inactive or overpopulated channels');
    }

    return recommendations;
  },
};
