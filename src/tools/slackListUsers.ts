

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack List Users Tool
 * Comprehensive user listing with filtering, analytics, and presence tracking
 */
export const slackListUsersTool: MCPTool = {
  name: 'slack_list_users',
  description: 'List all users in the workspace with advanced filtering, analytics, and presence tracking',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of users to return (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving next page of results',
      },
      include_locale: {
        type: 'boolean',
        description: 'Include user locale information',
        default: false,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include user presence status (requires additional API calls)',
        default: true,
      },
      include_profile_analytics: {
        type: 'boolean',
        description: 'Include profile completeness and analytics',
        default: true,
      },
      filter_by_status: {
        type: 'string',
        enum: ['active', 'away', 'dnd', 'all'],
        description: 'Filter users by presence status',
        default: 'all',
      },
      filter_by_role: {
        type: 'string',
        enum: ['admin', 'owner', 'member', 'guest', 'restricted', 'ultra_restricted', 'all'],
        description: 'Filter users by workspace role',
        default: 'all',
      },
      filter_by_account_type: {
        type: 'string',
        enum: ['regular', 'bot', 'app', 'workflow_bot', 'all'],
        description: 'Filter users by account type',
        default: 'all',
      },
      include_deleted: {
        type: 'boolean',
        description: 'Include deleted/deactivated users',
        default: false,
      },
      include_bots: {
        type: 'boolean',
        description: 'Include bot users',
        default: true,
      },
      sort_by: {
        type: 'string',
        enum: ['name', 'real_name', 'display_name', 'status', 'last_activity', 'profile_score'],
        description: 'Sort users by specified field',
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
        description: 'Filter users by name (case-insensitive partial match)',
      },
      timezone_filter: {
        type: 'string',
        description: 'Filter users by timezone (e.g., "America/New_York")',
      },
      department_filter: {
        type: 'string',
        description: 'Filter users by department/title (searches profile fields)',
      },
      include_activity_analytics: {
        type: 'boolean',
        description: 'Include user activity patterns and engagement metrics',
        default: false,
      },
    },
    required: [],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.listUsers, args);
      
      // Get users from Slack API
      const usersResult = await slackClient.getClient().users.list({
        limit: validatedArgs.limit,
        cursor: validatedArgs.cursor,
        include_locale: validatedArgs.include_locale,
      });

      if (!usersResult.members) {
        throw new Error('Failed to retrieve users');
      }

      let users = usersResult.members;

      // Apply basic filters
      users = applyBasicFilters(users, validatedArgs);

      // Enhance user data with analytics and presence
      const enhancedUsers = await Promise.all(
        users.map(async (user) => {
          const enhancedUser: any = {
            ...user,
            analysis: await generateUserAnalysis(user),
          };

          // Get presence information if requested
          if (validatedArgs.include_presence && user.id && !user.is_bot) {
            try {
              const presenceResult = await slackClient.getClient().users.getPresence({
                user: user.id,
              });
              
              enhancedUser.presence = {
                status: presenceResult.presence,
                auto_away: presenceResult.auto_away,
                manual_away: presenceResult.manual_away,
                connection_count: presenceResult.connection_count,
                last_activity: presenceResult.last_activity ? 
                  new Date(presenceResult.last_activity * 1000).toISOString() : null,
              };
            } catch (error) {
              logger.warn(`Failed to get presence for user ${user.id}:`, ErrorHandler.handleError(error));
              enhancedUser.presence = null;
            }
          }

          // Add analytics if requested
          if (validatedArgs.include_analytics) {
            enhancedUser.profile_analytics = generateProfileAnalytics(user);
            enhancedUser.activity_analytics = await generateActivityAnalytics(user);
          }

          return enhancedUser;
        })
      );

      // Apply advanced filters (after enhancement)
      const filteredUsers = applyAdvancedFilters(enhancedUsers, validatedArgs);

      // Sort users
      const sortedUsers = sortUsers(filteredUsers, validatedArgs.sort_by || 'name', validatedArgs.sort_direction || 'asc');

      // Generate summary statistics
      const summary = generateUserSummary(sortedUsers, users.length);

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_list_users', args, duration);

      return {
        success: true,
        users: sortedUsers,
        summary,
        pagination: {
          has_more: !!usersResult.response_metadata?.next_cursor,
          next_cursor: usersResult.response_metadata?.next_cursor || null,
          total_returned: sortedUsers.length,
          total_before_filtering: users.length,
        },
        metadata: {
          filters_applied: {
            status: validatedArgs.status_filter,
            role: null, // Note: role filtering not in schema
            account_type: null, // Note: account_type filtering not in schema
            include_deleted: validatedArgs.include_deleted,
            include_bots: validatedArgs.include_bots,
            name_filter: validatedArgs.name_filter || null,
            timezone_filter: null, // Note: timezone_filter not in schema
            department_filter: null, // Note: department_filter not in schema
          },
          sorting: {
            sort_by: validatedArgs.sort_by,
            sort_direction: validatedArgs.sort_direction,
          },
          data_included: {
            locale: validatedArgs.include_locale,
            presence: validatedArgs.include_presence,
            profile_analytics: validatedArgs.include_analytics,
            activity_analytics: validatedArgs.include_analytics,
          },
          execution_time_ms: duration,
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
};

/**
 * Apply basic filters to user list
 */
function applyBasicFilters(users: any[], args: any): any[] {
  return users.filter(user => {
    // Filter deleted users
    if (!args.include_deleted && user.deleted) {
      return false;
    }

    // Filter bots
    if (!args.include_bots && user.is_bot) {
      return false;
    }

    // Filter by account type
    if (args.filter_by_account_type !== 'all') {
      switch (args.filter_by_account_type) {
        case 'regular':
          if (user.is_bot || user.is_app_user || user.is_workflow_bot) return false;
          break;
        case 'bot':
          if (!user.is_bot) return false;
          break;
        case 'app':
          if (!user.is_app_user) return false;
          break;
        case 'workflow_bot':
          if (!user.is_workflow_bot) return false;
          break;
      }
    }

    // Filter by role
    if (args.filter_by_role !== 'all') {
      const userRole = getUserRole(user);
      if (userRole !== args.filter_by_role) {
        return false;
      }
    }

    // Filter by name
    if (args.name_filter) {
      const filterLower = args.name_filter.toLowerCase();
      const matchesName = user.name?.toLowerCase().includes(filterLower) ||
                         user.real_name?.toLowerCase().includes(filterLower) ||
                         user.profile?.display_name?.toLowerCase().includes(filterLower);
      if (!matchesName) {
        return false;
      }
    }

    // Filter by timezone
    if (args.timezone_filter) {
      if (user.tz !== args.timezone_filter) {
        return false;
      }
    }

    // Filter by department
    if (args.department_filter) {
      const filterLower = args.department_filter.toLowerCase();
      const matchesDepartment = user.profile?.title?.toLowerCase().includes(filterLower) ||
                               user.profile?.fields?.department?.value?.toLowerCase().includes(filterLower);
      if (!matchesDepartment) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Apply advanced filters (after presence data is loaded)
 */
function applyAdvancedFilters(users: any[], args: any): any[] {
  return users.filter(user => {
    // Filter by presence status
    if (args.filter_by_status !== 'all' && user.presence) {
      if (user.presence.status !== args.filter_by_status) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get user role from user object
 */
function getUserRole(user: any): string {
  if (user.is_owner) return 'owner';
  if (user.is_admin) return 'admin';
  if (user.is_ultra_restricted) return 'ultra_restricted';
  if (user.is_restricted) return 'restricted';
  if (user.is_stranger) return 'guest';
  return 'member';
}

/**
 * Generate user analysis
 */
async function generateUserAnalysis(user: any): Promise<any> {
  return {
    account_type: user.is_bot ? 'bot' : user.is_app_user ? 'app' : 'regular',
    role: getUserRole(user),
    is_active: !user.deleted && !user.is_restricted,
    has_avatar: !!(user.profile?.image_72),
    has_real_name: !!(user.real_name && user.real_name !== user.name),
    has_display_name: !!(user.profile?.display_name),
    has_status: !!(user.profile?.status_text || user.profile?.status_emoji),
    timezone: user.tz || null,
    timezone_label: user.tz_label || null,
    timezone_offset: user.tz_offset || null,
    created_date: user.updated ? new Date(user.updated * 1000).toISOString() : null,
    is_email_confirmed: !!user.is_email_confirmed,
    has_2fa: !!user.has_2fa,
  };
}

/**
 * Generate profile analytics
 */
function generateProfileAnalytics(user: any): any {
  const profile = user.profile || {};
  
  let completenessScore = 0;
  let maxScore = 10;

  // Score profile completeness
  if (profile.real_name) completenessScore += 1;
  if (profile.display_name) completenessScore += 1;
  if (profile.email) completenessScore += 1;
  if (profile.phone) completenessScore += 1;
  if (profile.title) completenessScore += 1;
  if (profile.image_72 && !profile.image_72.includes('default')) completenessScore += 2;
  if (profile.status_text || profile.status_emoji) completenessScore += 1;
  if (user.tz) completenessScore += 1;
  if (profile.fields && Object.keys(profile.fields).length > 0) completenessScore += 1;

  return {
    completeness_score: completenessScore,
    completeness_percentage: Math.round((completenessScore / maxScore) * 100),
    has_custom_avatar: !!(profile.image_72 && !profile.image_72.includes('default')),
    has_contact_info: !!(profile.email || profile.phone),
    has_job_title: !!profile.title,
    has_custom_fields: !!(profile.fields && Object.keys(profile.fields).length > 0),
    profile_fields_count: profile.fields ? Object.keys(profile.fields).length : 0,
    last_profile_update: profile.image_original ? 'has_custom_image' : 'default_image',
  };
}

/**
 * Generate activity analytics (simplified version)
 */
async function generateActivityAnalytics(user: any): Promise<any> {
  // This would require additional API calls for comprehensive analytics
  return {
    estimated_activity_level: user.presence?.status === 'active' ? 'high' : 'low',
    last_seen: user.presence?.last_activity || null,
    connection_count: user.presence?.connection_count || 0,
    is_currently_active: user.presence?.status === 'active',
    auto_away_enabled: user.presence?.auto_away || false,
    manual_away_status: user.presence?.manual_away || false,
    note: 'Comprehensive activity analytics require additional API permissions and calls',
    available_metrics: [
      'message_count_last_30_days',
      'channels_active_in',
      'files_shared_count',
      'reactions_given_received',
      'thread_participation',
      'peak_activity_hours',
    ],
    implementation_status: 'basic',
  };
}

/**
 * Sort users by specified criteria
 */
function sortUsers(users: any[], sortBy: string, sortDirection: string): any[] {
  return users.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'real_name':
        aValue = a.real_name || a.name || '';
        bValue = b.real_name || b.name || '';
        break;
      case 'display_name':
        aValue = a.profile?.display_name || a.real_name || a.name || '';
        bValue = b.profile?.display_name || b.real_name || b.name || '';
        break;
      case 'status':
        aValue = a.presence?.status || 'unknown';
        bValue = b.presence?.status || 'unknown';
        break;
      case 'last_activity':
        aValue = a.presence?.last_activity || 0;
        bValue = b.presence?.last_activity || 0;
        break;
      case 'profile_score':
        aValue = a.profile_analytics?.completeness_score || 0;
        bValue = b.profile_analytics?.completeness_score || 0;
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
 * Generate user summary statistics
 */
function generateUserSummary(users: any[], totalBeforeFiltering: number): any {
  const summary = {
    total_users: users.length,
    total_before_filtering: totalBeforeFiltering,
    by_type: {
      regular: 0,
      bot: 0,
      app: 0,
      workflow_bot: 0,
    },
    by_role: {
      owner: 0,
      admin: 0,
      member: 0,
      guest: 0,
      restricted: 0,
      ultra_restricted: 0,
    },
    by_status: {
      active: 0,
      away: 0,
      dnd: 0,
      unknown: 0,
    },
    profile_stats: {
      average_completeness: 0,
      users_with_custom_avatar: 0,
      users_with_status: 0,
      users_with_timezone: 0,
    },
    activity_stats: {
      currently_active: 0,
      recently_active: 0,
      inactive: 0,
    },
  };

  let totalCompletenessScore = 0;
  let usersWithCompleteness = 0;

  users.forEach(user => {
    // Count by type
    if (user.is_bot) {
      summary.by_type.bot++;
    } else if (user.is_app_user) {
      summary.by_type.app++;
    } else if (user.is_workflow_bot) {
      summary.by_type.workflow_bot++;
    } else {
      summary.by_type.regular++;
    }

    // Count by role (only for non-bot users)
    if (!user.is_bot) {
      const role = getUserRole(user);
      summary.by_role[role as keyof typeof summary.by_role]++;
    }

    // Count by status
    const status = user.presence?.status || 'unknown';
    summary.by_status[status as keyof typeof summary.by_status]++;

    // Profile statistics
    if (user.profile_analytics) {
      totalCompletenessScore += user.profile_analytics.completeness_score;
      usersWithCompleteness++;
      
      if (user.profile_analytics.has_custom_avatar) {
        summary.profile_stats.users_with_custom_avatar++;
      }
    }

    if (user.profile?.status_text || user.profile?.status_emoji) {
      summary.profile_stats.users_with_status++;
    }

    if (user.tz) {
      summary.profile_stats.users_with_timezone++;
    }

    // Activity statistics
    if (user.presence?.status === 'active') {
      summary.activity_stats.currently_active++;
    } else if (user.presence?.last_activity) {
      const lastActivity = new Date(user.presence.last_activity * 1000);
      const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceActivity < 24) {
        summary.activity_stats.recently_active++;
      } else {
        summary.activity_stats.inactive++;
      }
    } else {
      summary.activity_stats.inactive++;
    }
  });

  // Calculate averages
  if (usersWithCompleteness > 0) {
    summary.profile_stats.average_completeness = Math.round(totalCompletenessScore / usersWithCompleteness);
  }

  return summary;
}

