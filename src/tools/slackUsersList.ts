/**
 * Enhanced Slack Users List Tool v2.0.0 - THE FINAL TOOL!
 * Comprehensive user listing with advanced filtering, analytics, and workspace insights
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * Input validation schema
 */
const inputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  include_locale: z.boolean().default(false),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  include_presence: z.boolean().default(false),
  filter_by_name: z.string().optional(),
  filter_by_title: z.string().optional(),
  filter_by_status: z.enum(['active', 'inactive', 'deleted', 'all']).default('all'),
  filter_by_user_type: z.enum(['human', 'bot', 'app', 'all']).default('all'),
  sort_by: z.enum(['name', 'real_name', 'created', 'title']).default('name'),
  detailed_analysis: z.boolean().default(false),
});

type SlackUsersListArgs = z.infer<typeof inputSchema>;

/**
 * Workspace analytics interface
 */
interface WorkspaceAnalytics {
  workspace_demographics: {
    total_users: number;
    active_users: number;
    inactive_users: number;
    deleted_users: number;
    bot_users: number;
    human_users: number;
    app_users: number;
  };
  user_distribution: {
    by_role: Record<string, number>;
    by_status: Record<string, number>;
    by_user_type: Record<string, number>;
    by_timezone: Record<string, number>;
  };
  engagement_metrics: {
    users_with_profiles: number;
    users_with_status: number;
    users_with_2fa: number;
    users_with_confirmed_email: number;
    profile_completeness_average: number;
    security_score_average: number;
  };
  workspace_insights: {
    admin_count: number;
    owner_count: number;
    guest_count: number;
    enterprise_users: number;
    timezone_diversity_score: number; // 0-100
    profile_health_score: number; // 0-100
    security_health_score: number; // 0-100
  };
  activity_patterns: {
    most_common_timezone: string | null;
    profile_completion_rate: number; // 0-100
    security_adoption_rate: number; // 0-100
    active_user_percentage: number; // 0-100
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Enhanced user interface
 */
interface EnhancedUser {
  id: string;
  team_id?: string;
  name?: string;
  deleted?: boolean;
  color?: string;
  real_name?: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile?: {
    title?: string;
    phone?: string;
    skype?: string;
    real_name?: string;
    real_name_normalized?: string;
    display_name?: string;
    display_name_normalized?: string;
    fields?: Record<string, any>;
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
    avatar_hash?: string;
    image_original?: string;
    is_custom_image?: boolean;
    email?: string;
    first_name?: string;
    last_name?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
    image_192?: string;
    image_512?: string;
    image_1024?: string;
    status_text_canonical?: string;
    team?: string;
  };
  is_admin?: boolean;
  is_owner?: boolean;
  is_primary_owner?: boolean;
  is_restricted?: boolean;
  is_ultra_restricted?: boolean;
  is_bot?: boolean;
  is_app_user?: boolean;
  is_workflow_bot?: boolean;
  updated?: number;
  is_email_confirmed?: boolean;
  who_can_share_contact_card?: string;
  locale?: string;
  presence?: string;
  enterprise_user?: {
    id?: string;
    enterprise_id?: string;
    enterprise_name?: string;
    is_admin?: boolean;
    is_owner?: boolean;
    teams?: string[];
  };
  has_2fa?: boolean;
  two_factor_type?: string;
  metadata?: {
    profile_completeness_score?: number;
    security_score?: number;
    engagement_level?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
    account_type?: 'human' | 'bot' | 'app' | 'workflow';
    permissions_level?: 'owner' | 'admin' | 'member' | 'guest' | 'restricted';
  };
}

/**
 * Users list result interface
 */
interface UsersListResult {
  success: boolean;
  members: EnhancedUser[];
  response_metadata?: {
    next_cursor?: string;
  };
  cache_ts?: number;
  analytics?: WorkspaceAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackUsersListTool: MCPTool = {
  name: 'slack_users_list',
  description: 'List workspace users with comprehensive analytics, advanced filtering, and workspace insights',
  inputSchema: {
    type: 'object',
    properties: {
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving additional results',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of users to return (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      include_locale: {
        type: 'boolean',
        description: 'Include user locale information',
        default: false,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive workspace analytics and user insights',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for workspace optimization',
        default: true,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include real-time presence information for all users',
        default: false,
      },
      filter_by_name: {
        type: 'string',
        description: 'Filter users by name (partial match)',
      },
      filter_by_title: {
        type: 'string',
        description: 'Filter users by job title (partial match)',
      },
      filter_by_status: {
        type: 'string',
        description: 'Filter users by status',
        enum: ['active', 'inactive', 'deleted', 'all'],
        default: 'all',
      },
      filter_by_user_type: {
        type: 'string',
        description: 'Filter users by type',
        enum: ['human', 'bot', 'app', 'all'],
        default: 'all',
      },
      sort_by: {
        type: 'string',
        description: 'Sort users by field',
        enum: ['name', 'real_name', 'created', 'title'],
        default: 'name',
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Perform detailed analysis on each user',
        default: false,
      },
    },
    required: [],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackUsersListArgs;
      const client = slackClient.getClient();
      
      let workspaceAnalytics: WorkspaceAnalytics = {
        workspace_demographics: {
          total_users: 0,
          active_users: 0,
          inactive_users: 0,
          deleted_users: 0,
          bot_users: 0,
          human_users: 0,
          app_users: 0,
        },
        user_distribution: {
          by_role: {},
          by_status: {},
          by_user_type: {},
          by_timezone: {},
        },
        engagement_metrics: {
          users_with_profiles: 0,
          users_with_status: 0,
          users_with_2fa: 0,
          users_with_confirmed_email: 0,
          profile_completeness_average: 0,
          security_score_average: 0,
        },
        workspace_insights: {
          admin_count: 0,
          owner_count: 0,
          guest_count: 0,
          enterprise_users: 0,
          timezone_diversity_score: 0,
          profile_health_score: 0,
          security_health_score: 0,
        },
        activity_patterns: {
          most_common_timezone: null,
          profile_completion_rate: 0,
          security_adoption_rate: 0,
          active_user_percentage: 0,
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];

      // Step 1: Get users list
      const usersResult = await client.users.list({
        cursor: validatedArgs.cursor,
        limit: validatedArgs.limit,
        include_locale: validatedArgs.include_locale,
      });

      if (!usersResult.ok) {
        throw new Error(`Failed to get users list: ${usersResult.error}`);
      }

      let users = usersResult.members || [];

      // Step 2: Apply filtering
      users = this.applyFilters(users, validatedArgs);

      // Step 3: Get presence information if requested
      if (validatedArgs.include_presence && users.length > 0) {
        try {
          // Get presence for up to 50 users to avoid rate limits
          const usersToCheck = users.slice(0, 50);
          const presencePromises = usersToCheck.map(async (user: any) => {
            try {
              const presenceResult = await client.users.getPresence({ user: user.id });
              if (presenceResult.ok) {
                user.presence = presenceResult.presence;
              }
            } catch (error) {
              // Ignore individual presence failures
            }
          });
          
          await Promise.allSettled(presencePromises);
        } catch (error) {
          warnings.push('Could not retrieve presence information for all users');
        }
      }

      // Step 4: Enhance users with metadata if detailed analysis is requested
      if (validatedArgs.detailed_analysis) {
        users = users.map((user: any) => this.enhanceUserWithMetadata(user));
      }

      // Step 5: Sort users
      users = this.sortUsers(users, validatedArgs.sort_by);

      // Step 6: Generate analytics
      if (validatedArgs.include_analytics) {
        workspaceAnalytics = this.generateWorkspaceAnalytics(users, validatedArgs);
      }

      // Step 7: Generate recommendations
      if (validatedArgs.include_recommendations) {
        workspaceAnalytics.recommendations = this.generateRecommendations(workspaceAnalytics, users, validatedArgs);
      }

      workspaceAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_users_list', args, duration);

      return {
        success: true,
        data: {
          success: true,
          members: users,
          response_metadata: usersResult.response_metadata,
          cache_ts: usersResult.cache_ts,
          analytics: validatedArgs.include_analytics ? workspaceAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? workspaceAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as UsersListResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'users_list',
          users_retrieved: users.length,
          filters_applied: this.getAppliedFiltersCount(validatedArgs),
          has_more: !!usersResult.response_metadata?.next_cursor,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_users_list', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_users_list',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Apply filters to users list
   */
  applyFilters(users: any[], args: SlackUsersListArgs): any[] {
    let filteredUsers = [...users];

    // Filter by name
    if (args.filter_by_name) {
      const nameFilter = args.filter_by_name.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        (user.name && user.name.toLowerCase().includes(nameFilter)) ||
        (user.real_name && user.real_name.toLowerCase().includes(nameFilter)) ||
        (user.profile?.display_name && user.profile.display_name.toLowerCase().includes(nameFilter))
      );
    }

    // Filter by title
    if (args.filter_by_title) {
      const titleFilter = args.filter_by_title.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.profile?.title && user.profile.title.toLowerCase().includes(titleFilter)
      );
    }

    // Filter by status
    if (args.filter_by_status !== 'all') {
      filteredUsers = filteredUsers.filter(user => {
        switch (args.filter_by_status) {
          case 'active':
            return !user.deleted;
          case 'inactive':
            return user.deleted === false && !user.presence; // Not deleted but no presence
          case 'deleted':
            return user.deleted;
          default:
            return true;
        }
      });
    }

    // Filter by user type
    if (args.filter_by_user_type !== 'all') {
      filteredUsers = filteredUsers.filter(user => {
        switch (args.filter_by_user_type) {
          case 'human':
            return !user.is_bot && !user.is_app_user && !user.is_workflow_bot;
          case 'bot':
            return user.is_bot;
          case 'app':
            return user.is_app_user || user.is_workflow_bot;
          default:
            return true;
        }
      });
    }

    return filteredUsers;
  },

  /**
   * Sort users by specified field
   */
  sortUsers(users: any[], sortBy: SlackUsersListArgs['sort_by']): any[] {
    return users.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'real_name':
          return (a.real_name || '').localeCompare(b.real_name || '');
        case 'created':
          return (a.updated || 0) - (b.updated || 0);
        case 'title':
          return (a.profile?.title || '').localeCompare(b.profile?.title || '');
        default:
          return 0;
      }
    });
  },

  /**
   * Enhance user with metadata
   */
  enhanceUserWithMetadata(user: any): EnhancedUser {
    const enhanced = { ...user };
    
    // Calculate profile completeness
    let profileScore = 0;
    if (user.name) profileScore += 10;
    if (user.real_name) profileScore += 15;
    if (user.profile?.display_name) profileScore += 10;
    if (user.profile?.title) profileScore += 15;
    if (user.profile?.phone) profileScore += 10;
    if (user.profile?.email) profileScore += 15;
    if (user.profile?.image_original) profileScore += 15;
    if (user.profile?.fields && Object.keys(user.profile.fields).length > 0) profileScore += 10;
    
    // Calculate security score
    let securityScore = 40; // Base score
    if (user.has_2fa) securityScore += 30;
    if (user.is_email_confirmed) securityScore += 15;
    if (!user.deleted) securityScore += 10;
    if (!(user.is_restricted || user.is_ultra_restricted)) securityScore += 5;
    
    // Determine engagement level
    let engagementLevel: 'very_high' | 'high' | 'medium' | 'low' | 'very_low' = 'low';
    if (user.presence === 'active') engagementLevel = 'very_high';
    else if (user.presence === 'away') engagementLevel = 'medium';
    else if (user.is_bot) engagementLevel = 'high';
    else if (user.deleted) engagementLevel = 'very_low';
    
    // Determine account type
    let accountType: 'human' | 'bot' | 'app' | 'workflow' = 'human';
    if (user.is_bot) accountType = 'bot';
    else if (user.is_app_user) accountType = 'app';
    else if (user.is_workflow_bot) accountType = 'workflow';
    
    // Determine permissions level
    let permissionsLevel: 'owner' | 'admin' | 'member' | 'guest' | 'restricted' = 'member';
    if (user.is_primary_owner) permissionsLevel = 'owner';
    else if (user.is_owner) permissionsLevel = 'owner';
    else if (user.is_admin) permissionsLevel = 'admin';
    else if (user.is_ultra_restricted) permissionsLevel = 'restricted';
    else if (user.is_restricted) permissionsLevel = 'guest';
    
    enhanced.metadata = {
      profile_completeness_score: Math.min(profileScore, 100),
      security_score: Math.min(securityScore, 100),
      engagement_level: engagementLevel,
      account_type: accountType,
      permissions_level: permissionsLevel,
    };
    
    return enhanced;
  },

  /**
   * Generate comprehensive workspace analytics
   */
  generateWorkspaceAnalytics(users: any[], args: SlackUsersListArgs): WorkspaceAnalytics {
    const analytics: WorkspaceAnalytics = {
      workspace_demographics: {
        total_users: users.length,
        active_users: 0,
        inactive_users: 0,
        deleted_users: 0,
        bot_users: 0,
        human_users: 0,
        app_users: 0,
      },
      user_distribution: {
        by_role: {},
        by_status: {},
        by_user_type: {},
        by_timezone: {},
      },
      engagement_metrics: {
        users_with_profiles: 0,
        users_with_status: 0,
        users_with_2fa: 0,
        users_with_confirmed_email: 0,
        profile_completeness_average: 0,
        security_score_average: 0,
      },
      workspace_insights: {
        admin_count: 0,
        owner_count: 0,
        guest_count: 0,
        enterprise_users: 0,
        timezone_diversity_score: 0,
        profile_health_score: 0,
        security_health_score: 0,
      },
      activity_patterns: {
        most_common_timezone: null,
        profile_completion_rate: 0,
        security_adoption_rate: 0,
        active_user_percentage: 0,
      },
      recommendations: [],
      warnings: [],
    };

    if (users.length === 0) return analytics;

    let totalProfileScore = 0;
    let totalSecurityScore = 0;
    const timezones: Record<string, number> = {};

    users.forEach(user => {
      // Demographics
      if (user.deleted) {
        analytics.workspace_demographics.deleted_users++;
      } else {
        analytics.workspace_demographics.active_users++;
      }

      if (user.is_bot) {
        analytics.workspace_demographics.bot_users++;
        analytics.user_distribution.by_user_type['bot'] = (analytics.user_distribution.by_user_type['bot'] || 0) + 1;
      } else if (user.is_app_user || user.is_workflow_bot) {
        analytics.workspace_demographics.app_users++;
        analytics.user_distribution.by_user_type['app'] = (analytics.user_distribution.by_user_type['app'] || 0) + 1;
      } else {
        analytics.workspace_demographics.human_users++;
        analytics.user_distribution.by_user_type['human'] = (analytics.user_distribution.by_user_type['human'] || 0) + 1;
      }

      // Role distribution
      if (user.is_primary_owner || user.is_owner) {
        analytics.workspace_insights.owner_count++;
        analytics.user_distribution.by_role['owner'] = (analytics.user_distribution.by_role['owner'] || 0) + 1;
      } else if (user.is_admin) {
        analytics.workspace_insights.admin_count++;
        analytics.user_distribution.by_role['admin'] = (analytics.user_distribution.by_role['admin'] || 0) + 1;
      } else if (user.is_restricted || user.is_ultra_restricted) {
        analytics.workspace_insights.guest_count++;
        analytics.user_distribution.by_role['guest'] = (analytics.user_distribution.by_role['guest'] || 0) + 1;
      } else {
        analytics.user_distribution.by_role['member'] = (analytics.user_distribution.by_role['member'] || 0) + 1;
      }

      // Status distribution
      const status = user.deleted ? 'deleted' : 'active';
      analytics.user_distribution.by_status[status] = (analytics.user_distribution.by_status[status] || 0) + 1;

      // Timezone distribution
      if (user.tz) {
        timezones[user.tz] = (timezones[user.tz] || 0) + 1;
        analytics.user_distribution.by_timezone[user.tz] = (analytics.user_distribution.by_timezone[user.tz] || 0) + 1;
      }

      // Engagement metrics
      if (user.profile && (user.profile.real_name || user.profile.display_name)) {
        analytics.engagement_metrics.users_with_profiles++;
      }
      if (user.profile?.status_text) {
        analytics.engagement_metrics.users_with_status++;
      }
      if (user.has_2fa) {
        analytics.engagement_metrics.users_with_2fa++;
      }
      if (user.is_email_confirmed) {
        analytics.engagement_metrics.users_with_confirmed_email++;
      }
      if (user.enterprise_user) {
        analytics.workspace_insights.enterprise_users++;
      }

      // Calculate scores if metadata is available
      if (user.metadata) {
        totalProfileScore += user.metadata.profile_completeness_score || 0;
        totalSecurityScore += user.metadata.security_score || 0;
      }
    });

    // Calculate averages and percentages
    analytics.engagement_metrics.profile_completeness_average = totalProfileScore / users.length;
    analytics.engagement_metrics.security_score_average = totalSecurityScore / users.length;
    
    analytics.activity_patterns.profile_completion_rate = (analytics.engagement_metrics.users_with_profiles / users.length) * 100;
    analytics.activity_patterns.security_adoption_rate = (analytics.engagement_metrics.users_with_2fa / users.length) * 100;
    analytics.activity_patterns.active_user_percentage = (analytics.workspace_demographics.active_users / users.length) * 100;

    // Find most common timezone
    if (Object.keys(timezones).length > 0) {
      analytics.activity_patterns.most_common_timezone = Object.entries(timezones)
        .sort(([,a], [,b]) => b - a)[0][0];
    }

    // Calculate diversity and health scores
    analytics.workspace_insights.timezone_diversity_score = Math.min((Object.keys(timezones).length / users.length) * 100, 100);
    analytics.workspace_insights.profile_health_score = analytics.engagement_metrics.profile_completeness_average;
    analytics.workspace_insights.security_health_score = analytics.engagement_metrics.security_score_average;

    return analytics;
  },

  /**
   * Generate recommendations for workspace optimization
   */
  generateRecommendations(
    analytics: WorkspaceAnalytics,
    users: any[],
    args: SlackUsersListArgs
  ): string[] {
    const recommendations: string[] = [];

    // Profile completion recommendations
    if (analytics.activity_patterns.profile_completion_rate < 70) {
      recommendations.push('Low profile completion rate - encourage users to complete their profiles for better collaboration');
    } else if (analytics.activity_patterns.profile_completion_rate > 90) {
      recommendations.push('Excellent profile completion rate - your team is well-connected!');
    }

    // Security recommendations
    if (analytics.activity_patterns.security_adoption_rate < 50) {
      recommendations.push('Low 2FA adoption rate - implement security policies to encourage two-factor authentication');
    }

    if (analytics.workspace_insights.security_health_score < 60) {
      recommendations.push('Overall security health is low - review security policies and user education');
    }

    // Admin recommendations
    const adminPercentage = (analytics.workspace_insights.admin_count / analytics.workspace_demographics.total_users) * 100;
    if (adminPercentage > 20) {
      recommendations.push('High percentage of admin users - review admin permissions and consider principle of least privilege');
    } else if (adminPercentage < 5 && analytics.workspace_demographics.total_users > 20) {
      recommendations.push('Very few admin users - ensure adequate administrative coverage for your workspace');
    }

    // Guest user recommendations
    const guestPercentage = (analytics.workspace_insights.guest_count / analytics.workspace_demographics.total_users) * 100;
    if (guestPercentage > 30) {
      recommendations.push('High percentage of guest users - review guest access policies and permissions');
    }

    // Bot recommendations
    const botPercentage = (analytics.workspace_demographics.bot_users / analytics.workspace_demographics.total_users) * 100;
    if (botPercentage > 15) {
      recommendations.push('High number of bots - regularly review bot permissions and remove unused bots');
    }

    // Deleted user recommendations
    if (analytics.workspace_demographics.deleted_users > 0) {
      recommendations.push(`${analytics.workspace_demographics.deleted_users} deleted users found - consider removing them from the workspace`);
    }

    // Timezone diversity recommendations
    if (analytics.workspace_insights.timezone_diversity_score > 50) {
      recommendations.push('High timezone diversity - consider asynchronous communication practices and flexible meeting times');
    }

    // Enterprise recommendations
    if (analytics.workspace_insights.enterprise_users > 0) {
      recommendations.push('Enterprise users detected - ensure enterprise policies are properly configured and enforced');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Workspace user management looks healthy - continue monitoring and maintaining good practices');
    }

    return recommendations;
  },

  /**
   * Count applied filters
   */
  getAppliedFiltersCount(args: SlackUsersListArgs): number {
    let count = 0;
    if (args.filter_by_name) count++;
    if (args.filter_by_title) count++;
    if (args.filter_by_status !== 'all') count++;
    if (args.filter_by_user_type !== 'all') count++;
    return count;
  },
};

export default slackUsersListTool;
