/**
 * Enhanced Slack Users Info Tool v2.0.0
 * Comprehensive user information retrieval with detailed analytics and profile insights
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
  user: z.string()
    .min(1, 'User ID or username is required')
    .refine(val => val.startsWith('U') || val.startsWith('@'), 'User must be a valid ID (U1234567890) or username (@username)'),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  include_presence: z.boolean().default(false),
  detailed_analysis: z.boolean().default(false),
  security_assessment: z.boolean().default(false),
});

type SlackUsersInfoArgs = z.infer<typeof inputSchema>;

/**
 * User analytics interface
 */
interface UserAnalytics {
  user_metadata: {
    user_id: string;
    lookup_timestamp: string;
    lookup_success: boolean;
    data_completeness: number; // 0-100
  };
  account_analysis: {
    account_status: 'active' | 'inactive' | 'deleted' | 'restricted';
    account_type: 'human' | 'bot' | 'app' | 'workflow';
    permissions_level: 'owner' | 'admin' | 'member' | 'guest' | 'restricted';
    workspace_role: string;
    account_age_days: number | null;
  };
  profile_insights: {
    profile_completeness_score: number; // 0-100
    has_display_name: boolean;
    has_real_name: boolean;
    has_title: boolean;
    has_phone: boolean;
    has_profile_image: boolean;
    custom_fields_count: number;
    status_active: boolean;
  };
  security_profile: {
    has_2fa: boolean;
    email_confirmed: boolean;
    security_score: number; // 0-100
    account_verification_level: 'high' | 'medium' | 'low';
    potential_security_risks: string[];
  };
  engagement_metrics: {
    timezone_info: {
      timezone: string | null;
      timezone_label: string | null;
      timezone_offset: number | null;
      local_time: string | null;
    };
    presence_indicators: {
      current_presence: string | null;
      auto_away: boolean | null;
      manual_presence: string | null;
      connection_count: number | null;
      last_activity_estimate: string;
    };
    activity_assessment: {
      engagement_level: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
      activity_pattern: 'consistent' | 'sporadic' | 'inactive';
      communication_style: 'active' | 'responsive' | 'passive';
    };
  };
  workspace_integration: {
    team_membership: {
      primary_team: string | null;
      enterprise_user: boolean;
      teams_count: number;
    };
    role_analysis: {
      administrative_role: boolean;
      elevated_permissions: boolean;
      guest_restrictions: boolean;
      bot_functionality: boolean;
    };
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
}

/**
 * User info result interface
 */
interface UserInfoResult {
  success: boolean;
  user?: EnhancedUser;
  user_searched: string;
  lookup_timestamp: string;
  analytics?: UserAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackUsersInfoTool: MCPTool = {
  name: 'slack_users_info',
  description: 'Get comprehensive user information with detailed analytics, profile insights, and security assessment',
  inputSchema: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        description: 'User ID (U1234567890) or username (@username) to get information for',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive user analytics and insights',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for user management and engagement',
        default: true,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include real-time presence information for the user',
        default: false,
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Perform detailed user profile and activity analysis',
        default: false,
      },
      security_assessment: {
        type: 'boolean',
        description: 'Perform comprehensive security assessment of the user account',
        default: false,
      },
    },
    required: ['user'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackUsersInfoArgs;
      const client = slackClient.getClient();
      
      let userAnalytics: UserAnalytics = {
        user_metadata: {
          user_id: '',
          lookup_timestamp: new Date().toISOString(),
          lookup_success: false,
          data_completeness: 0,
        },
        account_analysis: {
          account_status: 'inactive',
          account_type: 'human',
          permissions_level: 'member',
          workspace_role: 'unknown',
          account_age_days: null,
        },
        profile_insights: {
          profile_completeness_score: 0,
          has_display_name: false,
          has_real_name: false,
          has_title: false,
          has_phone: false,
          has_profile_image: false,
          custom_fields_count: 0,
          status_active: false,
        },
        security_profile: {
          has_2fa: false,
          email_confirmed: false,
          security_score: 0,
          account_verification_level: 'low',
          potential_security_risks: [],
        },
        engagement_metrics: {
          timezone_info: {
            timezone: null,
            timezone_label: null,
            timezone_offset: null,
            local_time: null,
          },
          presence_indicators: {
            current_presence: null,
            auto_away: null,
            manual_presence: null,
            connection_count: null,
            last_activity_estimate: 'unknown',
          },
          activity_assessment: {
            engagement_level: 'low',
            activity_pattern: 'inactive',
            communication_style: 'passive',
          },
        },
        workspace_integration: {
          team_membership: {
            primary_team: null,
            enterprise_user: false,
            teams_count: 0,
          },
          role_analysis: {
            administrative_role: false,
            elevated_permissions: false,
            guest_restrictions: false,
            bot_functionality: false,
          },
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];
      let userId = validatedArgs.user;

      // Step 1: Resolve username to ID if needed
      if (validatedArgs.user.startsWith('@')) {
        const username = validatedArgs.user.slice(1);
        try {
          const usersResult = await client.users.list({
            limit: 1000,
          });
          
          if (usersResult.ok && usersResult.members) {
            const user = usersResult.members.find((u: any) => u.name === username);
            if (user && user.id) {
              userId = user.id;
            } else {
              throw new Error(`User @${username} not found`);
            }
          }
        } catch (error) {
          throw new Error(`Failed to resolve username: ${validatedArgs.user}`);
        }
      }

      // Step 2: Get user information
      let user: EnhancedUser | undefined;
      let lookupSuccess = false;
      
      try {
        const userResult = await client.users.info({
          user: userId,
        });

        if (userResult.ok && userResult.user) {
          user = userResult.user as EnhancedUser;
          lookupSuccess = true;
          userAnalytics.user_metadata.lookup_success = true;
          userAnalytics.user_metadata.user_id = user.id;
        } else {
          warnings.push(`User info lookup failed: ${userResult.error || 'User not found'}`);
        }
      } catch (error) {
        warnings.push('User info API call failed');
      }

      // Step 3: Get presence information if requested and user found
      if (validatedArgs.include_presence && user) {
        try {
          const presenceResult = await client.users.getPresence({
            user: user.id,
          });
          
          if (presenceResult.ok) {
            user.presence = presenceResult.presence;
            // Add additional presence data to user object if available
            if ('auto_away' in presenceResult) (user as any).auto_away = presenceResult.auto_away;
            if ('manual_presence' in presenceResult) (user as any).manual_presence = (presenceResult as any).manual_presence;
            if ('connection_count' in presenceResult) (user as any).connection_count = (presenceResult as any).connection_count;
            if ('last_activity' in presenceResult) (user as any).last_activity = (presenceResult as any).last_activity;
          }
        } catch (error) {
          warnings.push('Could not retrieve presence information');
        }
      }

      // Step 4: Generate analytics
      if (validatedArgs.include_analytics) {
        userAnalytics = this.generateUserAnalytics(
          userId,
          user,
          lookupSuccess,
          validatedArgs
        );
      }

      // Step 5: Generate recommendations
      if (validatedArgs.include_recommendations) {
        userAnalytics.recommendations = this.generateRecommendations(
          userAnalytics,
          user,
          validatedArgs
        );
      }

      userAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_users_info', args, duration);

      return {
        success: true,
        data: {
          success: lookupSuccess,
          user: user,
          user_searched: validatedArgs.user,
          lookup_timestamp: new Date().toISOString(),
          analytics: validatedArgs.include_analytics ? userAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? userAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as UserInfoResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'user_info',
          user_searched: validatedArgs.user,
          user_found: lookupSuccess,
          user_id: user?.id,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_users_info', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_users_info',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Generate comprehensive user analytics
   */
  generateUserAnalytics(
    userId: string,
    user: EnhancedUser | undefined,
    lookupSuccess: boolean,
    args: SlackUsersInfoArgs
  ): UserAnalytics {
    const analytics: UserAnalytics = {
      user_metadata: {
        user_id: userId,
        lookup_timestamp: new Date().toISOString(),
        lookup_success: lookupSuccess,
        data_completeness: this.calculateDataCompleteness(user),
      },
      account_analysis: this.analyzeAccount(user),
      profile_insights: this.analyzeProfile(user),
      security_profile: this.assessSecurity(user, args.security_assessment),
      engagement_metrics: this.analyzeEngagement(user),
      workspace_integration: this.analyzeWorkspaceIntegration(user),
      recommendations: [],
      warnings: [],
    };

    return analytics;
  },

  /**
   * Calculate data completeness percentage
   */
  calculateDataCompleteness(user: EnhancedUser | undefined): number {
    if (!user) return 0;
    
    let score = 0;
    const maxScore = 20;
    
    if (user.name) score += 2;
    if (user.real_name) score += 2;
    if (user.profile?.display_name) score += 2;
    if (user.profile?.title) score += 2;
    if (user.profile?.phone) score += 2;
    if (user.profile?.email) score += 2;
    if (user.profile?.image_original) score += 2;
    if (user.tz) score += 2;
    if (user.profile?.status_text) score += 2;
    if (user.profile?.fields && Object.keys(user.profile.fields).length > 0) score += 2;
    
    return Math.round((score / maxScore) * 100);
  },

  /**
   * Analyze user account
   */
  analyzeAccount(user: EnhancedUser | undefined): UserAnalytics['account_analysis'] {
    if (!user) {
      return {
        account_status: 'inactive',
        account_type: 'human',
        permissions_level: 'member',
        workspace_role: 'unknown',
        account_age_days: null,
      };
    }

    const accountStatus = user.deleted ? 'deleted' : 'active';
    const accountType = user.is_bot ? 'bot' : user.is_app_user ? 'app' : user.is_workflow_bot ? 'workflow' : 'human';
    const permissionsLevel = this.determinePermissionLevel(user);
    const workspaceRole = this.determineWorkspaceRole(user);
    
    // Calculate account age if updated timestamp is available
    let accountAgeDays: number | null = null;
    if (user.updated) {
      const accountCreated = new Date(user.updated * 1000);
      const now = new Date();
      accountAgeDays = Math.floor((now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      account_status: accountStatus,
      account_type: accountType,
      permissions_level: permissionsLevel,
      workspace_role: workspaceRole,
      account_age_days: accountAgeDays,
    };
  },

  /**
   * Determine user permission level
   */
  determinePermissionLevel(user: EnhancedUser): UserAnalytics['account_analysis']['permissions_level'] {
    if (user.is_primary_owner) return 'owner';
    if (user.is_owner) return 'owner';
    if (user.is_admin) return 'admin';
    if (user.is_ultra_restricted) return 'restricted';
    if (user.is_restricted) return 'guest';
    return 'member';
  },

  /**
   * Determine workspace role description
   */
  determineWorkspaceRole(user: EnhancedUser): string {
    if (user.is_primary_owner) return 'Primary Owner';
    if (user.is_owner) return 'Owner';
    if (user.is_admin) return 'Admin';
    if (user.is_bot) return 'Bot';
    if (user.is_app_user) return 'App User';
    if (user.is_workflow_bot) return 'Workflow Bot';
    if (user.is_ultra_restricted) return 'Single Channel Guest';
    if (user.is_restricted) return 'Multi Channel Guest';
    return 'Member';
  },

  /**
   * Analyze user profile
   */
  analyzeProfile(user: EnhancedUser | undefined): UserAnalytics['profile_insights'] {
    if (!user) {
      return {
        profile_completeness_score: 0,
        has_display_name: false,
        has_real_name: false,
        has_title: false,
        has_phone: false,
        has_profile_image: false,
        custom_fields_count: 0,
        status_active: false,
      };
    }

    const hasDisplayName = !!(user.profile?.display_name && user.profile.display_name.trim());
    const hasRealName = !!(user.profile?.real_name && user.profile.real_name.trim());
    const hasTitle = !!(user.profile?.title && user.profile.title.trim());
    const hasPhone = !!(user.profile?.phone && user.profile.phone.trim());
    const hasProfileImage = !!(user.profile?.image_original || user.profile?.avatar_hash);
    const customFieldsCount = Object.keys(user.profile?.fields || {}).length;
    const statusActive = !!(user.profile?.status_text && user.profile.status_text.trim());
    
    // Calculate profile completeness score
    let score = 0;
    if (hasDisplayName) score += 15;
    if (hasRealName) score += 15;
    if (hasTitle) score += 15;
    if (hasPhone) score += 10;
    if (hasProfileImage) score += 20;
    if (customFieldsCount > 0) score += Math.min(customFieldsCount * 5, 25);
    
    return {
      profile_completeness_score: Math.min(score, 100),
      has_display_name: hasDisplayName,
      has_real_name: hasRealName,
      has_title: hasTitle,
      has_phone: hasPhone,
      has_profile_image: hasProfileImage,
      custom_fields_count: customFieldsCount,
      status_active: statusActive,
    };
  },

  /**
   * Assess user security
   */
  assessSecurity(user: EnhancedUser | undefined, performAssessment: boolean): UserAnalytics['security_profile'] {
    if (!user) {
      return {
        has_2fa: false,
        email_confirmed: false,
        security_score: 0,
        account_verification_level: 'low',
        potential_security_risks: ['User not found'],
      };
    }

    const has2FA = !!user.has_2fa;
    const emailConfirmed = !!user.is_email_confirmed;
    const isDeleted = !!user.deleted;
    const isRestricted = !!(user.is_restricted || user.is_ultra_restricted);
    const isBot = !!user.is_bot;
    
    let securityScore = 40; // Base score
    if (has2FA) securityScore += 30;
    if (emailConfirmed) securityScore += 15;
    if (!isDeleted) securityScore += 10;
    if (!isRestricted) securityScore += 5;
    
    const potentialRisks: string[] = [];
    if (!has2FA && !isBot) potentialRisks.push('No two-factor authentication enabled');
    if (!emailConfirmed && !isBot) potentialRisks.push('Email address not confirmed');
    if (isDeleted) potentialRisks.push('Account is deleted');
    if (isRestricted) potentialRisks.push('Account has restricted access');
    if (user.is_admin && !has2FA) potentialRisks.push('Admin account without 2FA is high risk');
    
    const verificationLevel: 'high' | 'medium' | 'low' = 
      securityScore >= 80 ? 'high' : securityScore >= 60 ? 'medium' : 'low';
    
    return {
      has_2fa: has2FA,
      email_confirmed: emailConfirmed,
      security_score: Math.min(securityScore, 100),
      account_verification_level: verificationLevel,
      potential_security_risks: potentialRisks,
    };
  },

  /**
   * Analyze user engagement
   */
  analyzeEngagement(user: EnhancedUser | undefined): UserAnalytics['engagement_metrics'] {
    if (!user) {
      return {
        timezone_info: {
          timezone: null,
          timezone_label: null,
          timezone_offset: null,
          local_time: null,
        },
        presence_indicators: {
          current_presence: null,
          auto_away: null,
          manual_presence: null,
          connection_count: null,
          last_activity_estimate: 'unknown',
        },
        activity_assessment: {
          engagement_level: 'very_low',
          activity_pattern: 'inactive',
          communication_style: 'passive',
        },
      };
    }

    // Calculate local time if timezone info is available
    let localTime: string | null = null;
    if (user.tz_offset !== undefined) {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const localDate = new Date(utc + (user.tz_offset * 1000));
      localTime = localDate.toLocaleTimeString();
    }

    // Analyze engagement level
    let engagementLevel: UserAnalytics['engagement_metrics']['activity_assessment']['engagement_level'] = 'low';
    if (user.presence === 'active') engagementLevel = 'very_high';
    else if (user.presence === 'away') engagementLevel = 'medium';
    else if (user.deleted) engagementLevel = 'very_low';
    else if (user.is_bot) engagementLevel = 'high'; // Bots are typically active

    // Determine activity pattern
    let activityPattern: UserAnalytics['engagement_metrics']['activity_assessment']['activity_pattern'] = 'inactive';
    if (user.presence === 'active') activityPattern = 'consistent';
    else if (user.updated && (Date.now() / 1000 - user.updated) < 86400) activityPattern = 'consistent'; // Active within 24h
    else if (user.updated && (Date.now() / 1000 - user.updated) < 604800) activityPattern = 'sporadic'; // Active within 7 days

    // Determine communication style
    let communicationStyle: UserAnalytics['engagement_metrics']['activity_assessment']['communication_style'] = 'passive';
    if (user.presence === 'active') communicationStyle = 'active';
    else if (user.presence === 'away') communicationStyle = 'responsive';

    return {
      timezone_info: {
        timezone: user.tz || null,
        timezone_label: user.tz_label || null,
        timezone_offset: user.tz_offset || null,
        local_time: localTime,
      },
      presence_indicators: {
        current_presence: user.presence || null,
        auto_away: (user as any).auto_away || null,
        manual_presence: (user as any).manual_presence || null,
        connection_count: (user as any).connection_count || null,
        last_activity_estimate: user.updated ? new Date(user.updated * 1000).toISOString() : 'unknown',
      },
      activity_assessment: {
        engagement_level: engagementLevel,
        activity_pattern: activityPattern,
        communication_style: communicationStyle,
      },
    };
  },

  /**
   * Analyze workspace integration
   */
  analyzeWorkspaceIntegration(user: EnhancedUser | undefined): UserAnalytics['workspace_integration'] {
    if (!user) {
      return {
        team_membership: {
          primary_team: null,
          enterprise_user: false,
          teams_count: 0,
        },
        role_analysis: {
          administrative_role: false,
          elevated_permissions: false,
          guest_restrictions: false,
          bot_functionality: false,
        },
      };
    }

    const enterpriseUser = !!(user.enterprise_user && user.enterprise_user.id);
    const teamsCount = user.enterprise_user?.teams?.length || 1;
    const primaryTeam = user.team_id || user.enterprise_user?.enterprise_id || null;

    const administrativeRole = !!(user.is_admin || user.is_owner || user.is_primary_owner);
    const elevatedPermissions = administrativeRole;
    const guestRestrictions = !!(user.is_restricted || user.is_ultra_restricted);
    const botFunctionality = !!(user.is_bot || user.is_app_user || user.is_workflow_bot);

    return {
      team_membership: {
        primary_team: primaryTeam,
        enterprise_user: enterpriseUser,
        teams_count: teamsCount,
      },
      role_analysis: {
        administrative_role: administrativeRole,
        elevated_permissions: elevatedPermissions,
        guest_restrictions: guestRestrictions,
        bot_functionality: botFunctionality,
      },
    };
  },

  /**
   * Generate recommendations for user management and engagement
   */
  generateRecommendations(
    analytics: UserAnalytics,
    user: EnhancedUser | undefined,
    args: SlackUsersInfoArgs
  ): string[] {
    const recommendations: string[] = [];

    if (!analytics.user_metadata.lookup_success || !user) {
      recommendations.push('User not found - verify the user ID or username');
      return recommendations;
    }

    // Profile completeness recommendations
    if (analytics.profile_insights.profile_completeness_score < 50) {
      recommendations.push('User profile is incomplete - encourage them to complete their profile information');
    } else if (analytics.profile_insights.profile_completeness_score > 80) {
      recommendations.push('User has a well-completed profile - excellent for team collaboration!');
    }

    // Security recommendations
    if (!analytics.security_profile.has_2fa && analytics.account_analysis.account_type === 'human') {
      recommendations.push('User does not have 2FA enabled - strongly recommend enabling two-factor authentication');
    }

    if (analytics.security_profile.security_score < 60) {
      recommendations.push('User has low security score - review and improve security settings');
    }

    // Admin security recommendations
    if (analytics.workspace_integration.role_analysis.administrative_role && !analytics.security_profile.has_2fa) {
      recommendations.push('CRITICAL: Admin user without 2FA - immediate security risk that needs attention');
    }

    // Engagement recommendations
    switch (analytics.engagement_metrics.activity_assessment.engagement_level) {
      case 'very_low':
        recommendations.push('User shows very low engagement - consider reaching out to ensure they have necessary access and support');
        break;
      case 'low':
        recommendations.push('User shows low engagement - consider providing additional onboarding or support');
        break;
      case 'very_high':
        recommendations.push('User is highly engaged - great team member for collaboration and communication');
        break;
    }

    // Account status recommendations
    if (analytics.account_analysis.account_status === 'deleted') {
      recommendations.push('User account is deleted - consider if this user needs to be reactivated or replaced');
    }

    // Guest user recommendations
    if (analytics.workspace_integration.role_analysis.guest_restrictions) {
      recommendations.push('User has guest restrictions - ensure they have access to necessary channels and resources');
    }

    // Bot recommendations
    if (analytics.account_analysis.account_type === 'bot') {
      recommendations.push('Bot account detected - ensure bot permissions are appropriate and regularly reviewed');
    }

    // Data completeness recommendations
    if (analytics.user_metadata.data_completeness < 70) {
      recommendations.push('User data is incomplete - some features and analytics may be limited');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('User profile looks good - no specific actions needed at this time');
    }

    return recommendations;
  },
};

export default slackUsersInfoTool;
