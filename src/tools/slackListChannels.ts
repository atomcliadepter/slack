

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack List Channels Tool
 * Comprehensive channel listing with filtering, sorting, and metadata analysis
 */
export const slackListChannelsTool: MCPTool = {
  name: 'slack_list_channels',
  description: 'List all channels in the workspace with advanced filtering, sorting, and metadata analysis',
  inputSchema: {
    type: 'object',
    properties: {
      types: {
        type: 'string',
        description: 'Comma-separated list of channel types to include (public_channel, private_channel, mpim, im)',
        default: 'public_channel,private_channel',
      },
      exclude_archived: {
        type: 'boolean',
        description: 'Exclude archived channels from results',
        default: true,
      },
      limit: {
        type: 'number',
        description: 'Maximum number of channels to return (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving next page of results',
      },
      include_member_count: {
        type: 'boolean',
        description: 'Include member count for each channel (requires additional API calls)',
        default: true,
      },
      include_purpose_topic: {
        type: 'boolean',
        description: 'Include channel purpose and topic information',
        default: true,
      },
      sort_by: {
        type: 'string',
        enum: ['name', 'created', 'member_count', 'last_activity'],
        description: 'Sort channels by specified field',
        default: 'name',
      },
      sort_direction: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort direction',
        default: 'asc',
      },
      name_filter: {
        type: 'string',
        description: 'Filter channels by name (case-insensitive partial match)',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include channel analytics and activity insights',
        default: false,
      },
    },
    required: [],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.listChannels, args);
      
      // Parse channel types
      const channelTypes = (validatedArgs.types || 'public_channel,private_channel').split(',').map(t => t.trim());
      
      // Get channels from Slack API
      const channelsResult = await slackClient.getClient().conversations.list({
        types: channelTypes.join(','),
        exclude_archived: validatedArgs.exclude_archived,
        limit: validatedArgs.limit,
        cursor: validatedArgs.cursor,
      });

      if (!channelsResult.channels) {
        throw new Error('Failed to retrieve channels');
      }

      let channels = channelsResult.channels;

      // Apply name filter if specified
      if (validatedArgs.name_filter) {
        const filterLower = validatedArgs.name_filter.toLowerCase();
        channels = channels.filter(channel => 
          channel.name?.toLowerCase().includes(filterLower)
        );
      }

      // Enhance channel data
      const enhancedChannels = await Promise.all(
        channels.map(async (channel) => {
          const enhancedChannel: any = {
            ...channel,
            analysis: {
              is_public: !channel.is_private,
              is_archived: !!channel.is_archived,
              is_general: channel.is_general || channel.name === 'general',
              is_member: !!channel.is_member,
              has_purpose: !!(channel.purpose?.value),
              has_topic: !!(channel.topic?.value),
              created_date: channel.created ? new Date(channel.created * 1000).toISOString() : null,
            },
          };

          // Get member count if requested
          if (validatedArgs.include_member_count && channel.id) {
            try {
              // Get full member count using info API
              const infoResult = await slackClient.getClient().conversations.info({
                channel: channel.id,
                include_num_members: true,
              });
              
              enhancedChannel.member_count = infoResult.channel?.num_members || 0;
            } catch (error) {
              logger.warn(`Failed to get member count for channel ${channel.id}:`, ErrorHandler.handleError(error));
              enhancedChannel.member_count = null;
            }
          }

          // Include purpose and topic details
          if (validatedArgs.include_purpose_topic) {
            enhancedChannel.purpose_details = {
              value: channel.purpose?.value || '',
              creator: channel.purpose?.creator || null,
              last_set: channel.purpose?.last_set ? new Date(channel.purpose.last_set * 1000).toISOString() : null,
            };
            
            enhancedChannel.topic_details = {
              value: channel.topic?.value || '',
              creator: channel.topic?.creator || null,
              last_set: channel.topic?.last_set ? new Date(channel.topic.last_set * 1000).toISOString() : null,
            };
          }

          // Add analytics if requested
          if (validatedArgs.include_analytics) {
            enhancedChannel.analytics = await getChannelAnalytics(channel);
          }

          return enhancedChannel;
        })
      );

      // Sort channels
      const sortedChannels = sortChannels(enhancedChannels, validatedArgs.sort_by || 'name', validatedArgs.sort_direction || 'asc');

      // Generate summary statistics
      const summary = generateChannelSummary(sortedChannels, channelTypes);

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_list_channels', args, duration);

      return {
        success: true,
        channels: sortedChannels,
        summary,
        pagination: {
          has_more: !!channelsResult.response_metadata?.next_cursor,
          next_cursor: channelsResult.response_metadata?.next_cursor || null,
          total_returned: sortedChannels.length,
        },
        metadata: {
          channel_types_requested: channelTypes,
          filters_applied: {
            exclude_archived: validatedArgs.exclude_archived,
            name_filter: validatedArgs.name_filter || null,
          },
          sorting: {
            sort_by: validatedArgs.sort_by,
            sort_direction: validatedArgs.sort_direction,
          },
          data_included: {
            member_count: validatedArgs.include_member_count,
            purpose_topic: validatedArgs.include_purpose_topic,
            analytics: validatedArgs.include_analytics,
          },
          execution_time_ms: duration,
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
};

/**
 * Sort channels by specified criteria
 */
function sortChannels(channels: any[], sortBy: string, sortDirection: string): any[] {
  return channels.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'created':
        aValue = a.created || 0;
        bValue = b.created || 0;
        break;
      case 'member_count':
        aValue = a.member_count || 0;
        bValue = b.member_count || 0;
        break;
      case 'last_activity':
        aValue = a.latest?.ts || 0;
        bValue = b.latest?.ts || 0;
        break;
      default:
        aValue = a.name || '';
        bValue = b.name || '';
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'desc' ? -comparison : comparison;
    }

    const comparison = aValue - bValue;
    return sortDirection === 'desc' ? -comparison : comparison;
  });
}

/**
 * Generate channel summary statistics
 */
function generateChannelSummary(channels: any[], channelTypes: string[]): any {
  const summary = {
    total_channels: channels.length,
    by_type: {} as Record<string, number>,
    by_status: {
      active: 0,
      archived: 0,
    },
    member_stats: {
      total_members: 0,
      average_members_per_channel: 0,
      largest_channel: null as any,
      smallest_channel: null as any,
    },
    content_stats: {
      channels_with_purpose: 0,
      channels_with_topic: 0,
      channels_with_both: 0,
    },
  };

  // Initialize type counters
  channelTypes.forEach(type => {
    summary.by_type[type] = 0;
  });

  let totalMembers = 0;
  let channelsWithMemberCount = 0;
  let largestChannel: any = null;
  let smallestChannel: any = null;

  channels.forEach(channel => {
    // Count by type
    if (channel.is_private) {
      summary.by_type['private_channel'] = (summary.by_type['private_channel'] || 0) + 1;
    } else if (channel.is_im) {
      summary.by_type['im'] = (summary.by_type['im'] || 0) + 1;
    } else if (channel.is_mpim) {
      summary.by_type['mpim'] = (summary.by_type['mpim'] || 0) + 1;
    } else {
      summary.by_type['public_channel'] = (summary.by_type['public_channel'] || 0) + 1;
    }

    // Count by status
    if (channel.is_archived) {
      summary.by_status.archived++;
    } else {
      summary.by_status.active++;
    }

    // Member statistics
    if (typeof channel.member_count === 'number') {
      totalMembers += channel.member_count;
      channelsWithMemberCount++;

      if (!largestChannel || channel.member_count > largestChannel.member_count) {
        largestChannel = {
          name: channel.name,
          id: channel.id,
          member_count: channel.member_count,
        };
      }

      if (!smallestChannel || channel.member_count < smallestChannel.member_count) {
        smallestChannel = {
          name: channel.name,
          id: channel.id,
          member_count: channel.member_count,
        };
      }
    }

    // Content statistics
    const hasPurpose = !!(channel.purpose?.value || channel.purpose_details?.value);
    const hasTopic = !!(channel.topic?.value || channel.topic_details?.value);

    if (hasPurpose) summary.content_stats.channels_with_purpose++;
    if (hasTopic) summary.content_stats.channels_with_topic++;
    if (hasPurpose && hasTopic) summary.content_stats.channels_with_both++;
  });

  // Calculate averages
  if (channelsWithMemberCount > 0) {
    summary.member_stats.total_members = totalMembers;
    summary.member_stats.average_members_per_channel = Math.round(totalMembers / channelsWithMemberCount);
    summary.member_stats.largest_channel = largestChannel;
    summary.member_stats.smallest_channel = smallestChannel;
  }

  return summary;
}

/**
 * Get channel analytics (simplified version)
 */
async function getChannelAnalytics(channel: any): Promise<any> {
  // This would require additional API calls for comprehensive analytics
  // For now, return basic analysis based on available data
  return {
    activity_level: channel.latest ? 'active' : 'inactive',
    last_message_time: channel.latest?.ts ? new Date(parseFloat(channel.latest.ts) * 1000).toISOString() : null,
    estimated_activity: channel.latest ? 'recent' : 'stale',
    note: 'Comprehensive analytics require additional API permissions and calls',
    available_metrics: [
      'message_count_last_30_days',
      'active_members_last_week',
      'files_shared_count',
      'reactions_count',
      'thread_activity',
    ],
    implementation_status: 'basic',
  };
}
