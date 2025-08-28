import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Enhanced input validation schema
const inputSchema = z.object({
  limit: z.number().min(1).max(1000).optional().default(100),
  cursor: z.string().optional(),
  include_locale: z.boolean().optional().default(false),
  team_id: z.string().optional(),
  filter_by_name: z.string().optional(),
  filter_by_real_name: z.string().optional(),
  filter_by_title: z.string().optional(),
  filter_by_status: z.enum(['active', 'away', 'dnd', 'offline']).optional(),
  exclude_bots: z.boolean().optional().default(false),
  exclude_deleted: z.boolean().optional().default(true),
  exclude_restricted: z.boolean().optional().default(false),
  include_presence: z.boolean().optional().default(false),
  include_analytics: z.boolean().optional().default(true),
  sort_by: z.enum(['name', 'real_name', 'created', 'updated', 'title']).optional().default('name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

type SlackListUsersArgs = z.infer<typeof inputSchema>;

export const slackListUsersTool: MCPTool = {
  name: 'slack_list_users',
  description: 'List Slack users with advanced filtering, sorting, and analytics capabilities',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of users to retrieve (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving next page',
      },
      include_locale: {
        type: 'boolean',
        description: 'Include user locale and timezone information',
        default: false,
      },
      team_id: {
        type: 'string',
        description: 'Team ID to filter users (for Enterprise Grid)',
      },
      filter_by_name: {
        type: 'string',
        description: 'Filter users by username pattern (case-insensitive)',
      },
      filter_by_real_name: {
        type: 'string',
        description: 'Filter users by real name pattern (case-insensitive)',
      },
      filter_by_title: {
        type: 'string',
        description: 'Filter users by job title pattern (case-insensitive)',
      },
      filter_by_status: {
        type: 'string',
        enum: ['active', 'away', 'dnd', 'offline'],
        description: 'Filter users by presence status',
      },
      exclude_bots: {
        type: 'boolean',
        description: 'Exclude bot users from results',
        default: false,
      },
      exclude_deleted: {
        type: 'boolean',
        description: 'Exclude deleted users from results',
        default: true,
      },
      exclude_restricted: {
        type: 'boolean',
        description: 'Exclude restricted users from results',
        default: false,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include presence information for each user',
        default: false,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include user analytics and insights',
        default: true,
      },
      sort_by: {
        type: 'string',
        enum: ['name', 'real_name', 'created', 'updated', 'title'],
        description: 'Field to sort users by',
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
      const validatedArgs = Validator.validate(inputSchema, args) as SlackListUsersArgs;
      
      // Prepare API parameters
      const apiParams: any = {
        limit: validatedArgs.limit,
        cursor: validatedArgs.cursor,
        include_locale: validatedArgs.include_locale,
        team_id: validatedArgs.team_id,
      };

      // Remove undefined values
      Object.keys(apiParams).forEach(key => {
        if (apiParams[key] === undefined) {
          delete apiParams[key];
        }
      });

      // Retrieve users from Slack API
      const result = await slackClient.getClient().users.list(apiParams);

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      let users = result.members || [];

      // Apply client-side filters
      users = this.applyFilters(users, validatedArgs);

      // Enhance users with presence if requested
      if (validatedArgs.include_presence) {
        users = await this.enhanceWithPresence(users);
      }

      // Sort users
      users = this.sortUsers(users, validatedArgs);

      // Generate analytics if requested
      let analytics = {};
      if (validatedArgs.include_analytics) {
        analytics = this.generateUserAnalytics(users, validatedArgs);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_list_users', args, duration);

      return {
        success: true,
        data: {
          users,
          response_metadata: result.response_metadata,
          has_more: !!result.response_metadata?.next_cursor,
        },
        metadata: {
          execution_time_ms: duration,
          user_count: users.length,
          analytics: validatedArgs.include_analytics ? analytics : undefined,
          filters_applied: {
            name_filter: !!validatedArgs.filter_by_name,
            real_name_filter: !!validatedArgs.filter_by_real_name,
            title_filter: !!validatedArgs.filter_by_title,
            status_filter: !!validatedArgs.filter_by_status,
            bots_excluded: validatedArgs.exclude_bots,
            deleted_excluded: validatedArgs.exclude_deleted,
            restricted_excluded: validatedArgs.exclude_restricted,
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
      logger.logToolError('slack_list_users', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_list_users',
        args,
        execution_time_ms: duration,
      });
    }
  },

  // Helper method to apply client-side filters
  applyFilters(users: any[], args: SlackListUsersArgs): any[] {
    let filteredUsers = [...users];

    // Filter by name
    if (args.filter_by_name) {
      const nameFilter = args.filter_by_name.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.name?.toLowerCase().includes(nameFilter)
      );
    }

    // Filter by real name
    if (args.filter_by_real_name) {
      const realNameFilter = args.filter_by_real_name.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.real_name?.toLowerCase().includes(realNameFilter) ||
        user.profile?.real_name?.toLowerCase().includes(realNameFilter)
      );
    }

    // Filter by title
    if (args.filter_by_title) {
      const titleFilter = args.filter_by_title.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.profile?.title?.toLowerCase().includes(titleFilter)
      );
    }

    // Exclude bots
    if (args.exclude_bots) {
      filteredUsers = filteredUsers.filter(user => !user.is_bot);
    }

    // Exclude deleted users
    if (args.exclude_deleted) {
      filteredUsers = filteredUsers.filter(user => !user.deleted);
    }

    // Exclude restricted users
    if (args.exclude_restricted) {
      filteredUsers = filteredUsers.filter(user => 
        !user.is_restricted && !user.is_ultra_restricted
      );
    }

    return filteredUsers;
  },

  // Helper method to enhance users with presence information
  async enhanceWithPresence(users: any[]): Promise<any[]> {
    const enhancedUsers = [];

    for (const user of users) {
      const enhanced = { ...user };

      if (user.id && !user.is_bot) {
        try {
          const presenceResult = await slackClient.getClient().users.getPresence({
            user: user.id,
          });
          
          if (presenceResult.ok) {
            enhanced.presence_info = {
              presence: presenceResult.presence,
              online: presenceResult.online,
              auto_away: presenceResult.auto_away,
              manual_away: presenceResult.manual_away,
              connection_count: presenceResult.connection_count,
              last_activity: presenceResult.last_activity,
            };
          }
        } catch (error) {
          // Continue without presence info if API call fails
          logger.error(`Failed to get presence for user ${user.id}:`, error);
        }
      }

      enhancedUsers.push(enhanced);
    }

    return enhancedUsers;
  },

  // Helper method to sort users
  sortUsers(users: any[], args: SlackListUsersArgs): any[] {
    const sortedUsers = [...users];

    sortedUsers.sort((a, b) => {
      let aValue, bValue;

      switch (args.sort_by) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'real_name':
          aValue = a.real_name || a.profile?.real_name || '';
          bValue = b.real_name || b.profile?.real_name || '';
          break;
        case 'created':
          aValue = a.created || 0;
          bValue = b.created || 0;
          break;
        case 'updated':
          aValue = a.updated || 0;
          bValue = b.updated || 0;
          break;
        case 'title':
          aValue = a.profile?.title || '';
          bValue = b.profile?.title || '';
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

    return sortedUsers;
  },

  // Helper method to generate user analytics
  generateUserAnalytics(users: any[], args: SlackListUsersArgs): Record<string, any> {
    const totalUsers = users.length;
    
    if (totalUsers === 0) {
      return {
        summary: { total_users: 0 },
        note: 'No users found matching the criteria',
      };
    }

    // User type distribution
    const typeDistribution = users.reduce((acc, user) => {
      if (user.is_bot) {
        acc.bots = (acc.bots || 0) + 1;
      } else {
        acc.humans = (acc.humans || 0) + 1;
      }
      
      if (user.is_admin) {
        acc.admins = (acc.admins || 0) + 1;
      }
      
      if (user.is_owner) {
        acc.owners = (acc.owners || 0) + 1;
      }
      
      if (user.is_restricted || user.is_ultra_restricted) {
        acc.restricted = (acc.restricted || 0) + 1;
      }
      
      if (user.deleted) {
        acc.deleted = (acc.deleted || 0) + 1;
      }
      
      return acc;
    }, {} as Record<string, number>);

    // Profile completeness analysis
    const profileAnalysis = this.analyzeProfiles(users);

    // Security analysis
    const securityAnalysis = this.analyzeUserSecurity(users);

    // Presence analysis (if included)
    let presenceAnalysis = {};
    if (args.include_presence) {
      presenceAnalysis = this.analyzePresence(users);
    }

    // Timezone analysis
    const timezoneAnalysis = this.analyzeTimezones(users);

    return {
      summary: {
        total_users: totalUsers,
        type_distribution: typeDistribution,
      },
      profile_analysis: profileAnalysis,
      security_analysis: securityAnalysis,
      presence_analysis: args.include_presence ? presenceAnalysis : undefined,
      timezone_analysis: timezoneAnalysis,
      retrieval_info: {
        requested_limit: args.limit,
        actual_retrieved: totalUsers,
        filters_applied: !!(args.filter_by_name || args.filter_by_real_name || args.filter_by_title),
        sort_applied: `${args.sort_by} (${args.sort_order})`,
      },
      recommendations: this.generateUserRecommendations(users, args),
    };
  },

  // Helper method to analyze user profiles
  analyzeProfiles(users: any[]): Record<string, any> {
    const usersWithProfiles = users.filter(user => user.profile);
    
    if (usersWithProfiles.length === 0) {
      return { note: 'No profile data available' };
    }

    const profileStats = {
      with_avatar: usersWithProfiles.filter(user => 
        user.profile.image_72 || user.profile.avatar_hash
      ).length,
      with_title: usersWithProfiles.filter(user => user.profile.title).length,
      with_phone: usersWithProfiles.filter(user => user.profile.phone).length,
      with_status: usersWithProfiles.filter(user => 
        user.profile.status_text || user.profile.status_emoji
      ).length,
    };

    // Calculate completion rates
    const completionRates = {
      avatar_rate: Math.round((profileStats.with_avatar / usersWithProfiles.length) * 100),
      title_rate: Math.round((profileStats.with_title / usersWithProfiles.length) * 100),
      phone_rate: Math.round((profileStats.with_phone / usersWithProfiles.length) * 100),
      status_rate: Math.round((profileStats.with_status / usersWithProfiles.length) * 100),
    };

    return {
      ...profileStats,
      completion_rates: completionRates,
      users_analyzed: usersWithProfiles.length,
    };
  },

  // Helper method to analyze user security
  analyzeUserSecurity(users: any[]): Record<string, any> {
    const securityStats = {
      with_2fa: users.filter(user => user.has_2fa).length,
      without_2fa: users.filter(user => !user.has_2fa && !user.is_bot).length,
      email_confirmed: users.filter(user => user.is_email_confirmed).length,
    };

    return {
      ...securityStats,
      two_factor_rate: Math.round((securityStats.with_2fa / users.length) * 100),
      email_confirmation_rate: Math.round((securityStats.email_confirmed / users.length) * 100),
    };
  },

  // Helper method to analyze user presence
  analyzePresence(users: any[]): Record<string, any> {
    const usersWithPresence = users.filter(user => user.presence_info);
    
    if (usersWithPresence.length === 0) {
      return { note: 'No presence data available' };
    }

    const presenceStats = usersWithPresence.reduce((acc, user) => {
      const presence = user.presence_info.presence;
      acc[presence] = (acc[presence] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const onlineUsers = usersWithPresence.filter(user => user.presence_info.online).length;
    const activeConnections = usersWithPresence.reduce((sum, user) => 
      sum + (user.presence_info.connection_count || 0), 0
    );

    return {
      presence_distribution: presenceStats,
      online_users: onlineUsers,
      online_rate: Math.round((onlineUsers / usersWithPresence.length) * 100),
      total_connections: activeConnections,
      average_connections: Math.round(activeConnections / usersWithPresence.length),
    };
  },

  // Helper method to analyze timezones
  analyzeTimezones(users: any[]): Record<string, any> {
    const usersWithTimezone = users.filter(user => user.tz);
    
    if (usersWithTimezone.length === 0) {
      return { note: 'No timezone data available' };
    }

    const timezoneDistribution = usersWithTimezone.reduce((acc, user) => {
      const tz = user.tz;
      acc[tz] = (acc[tz] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTimezones = Object.entries(timezoneDistribution)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([tz, count]) => ({ timezone: tz, user_count: count as number }));

    return {
      unique_timezones: Object.keys(timezoneDistribution).length,
      top_timezones: topTimezones,
      users_with_timezone: usersWithTimezone.length,
    };
  },

  // Helper method to generate recommendations
  generateUserRecommendations(users: any[], args: SlackListUsersArgs): string[] {
    const recommendations = [];
    const totalUsers = users.length;

    if (totalUsers === 0) {
      recommendations.push('No users found - consider adjusting your filter criteria');
      return recommendations;
    }

    // Profile completion recommendations
    const usersWithoutAvatar = users.filter(user => 
      !user.is_bot && (!user.profile?.image_72 && !user.profile?.avatar_hash)
    ).length;
    
    if (usersWithoutAvatar > totalUsers * 0.3) {
      recommendations.push('Many users lack profile pictures - consider encouraging avatar uploads');
    }

    const usersWithoutTitle = users.filter(user => 
      !user.is_bot && !user.profile?.title
    ).length;
    
    if (usersWithoutTitle > totalUsers * 0.5) {
      recommendations.push('Many users lack job titles - consider updating profile requirements');
    }

    // Security recommendations
    const usersWithout2FA = users.filter(user => 
      !user.has_2fa && !user.is_bot
    ).length;
    
    if (usersWithout2FA > 0) {
      recommendations.push(`${usersWithout2FA} users lack two-factor authentication - consider security policy updates`);
    }

    // Pagination recommendations
    if (args.limit >= 100 && totalUsers === args.limit) {
      recommendations.push('You may have more users - consider using pagination to see all results');
    }

    // Presence recommendations
    if (args.include_presence) {
      const offlineUsers = users.filter(user => 
        user.presence_info && !user.presence_info.online
      ).length;
      
      if (offlineUsers > totalUsers * 0.7) {
        recommendations.push('Many users appear offline - consider asynchronous communication strategies');
      }
    }

    return recommendations;
  },
};
