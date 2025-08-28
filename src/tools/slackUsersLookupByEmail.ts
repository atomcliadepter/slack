/**
 * Enhanced Slack Users Lookup By Email Tool v2.0.0
 * Comprehensive user lookup with email-based search and advanced user analytics
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
  email: z.string()
    .min(1, 'Email address is required')
    .email('Must be a valid email address'),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  include_presence: z.boolean().default(false),
  verify_email_format: z.boolean().default(true),
  detailed_analysis: z.boolean().default(false),
});

type SlackUsersLookupByEmailArgs = z.infer<typeof inputSchema>;

/**
 * User lookup analytics interface
 */
interface UserLookupAnalytics {
  lookup_metadata: {
    email_searched: string;
    lookup_timestamp: string;
    lookup_success: boolean;
    lookup_confidence: 'high' | 'medium' | 'low';
  };
  email_verification: {
    format_valid: boolean;
    domain_analysis: {
      domain: string;
      is_common_provider: boolean;
      is_business_domain: boolean;
    };
    email_status: 'verified' | 'unverified' | 'invalid';
  };
  user_intelligence: {
    user_found: boolean;
    account_status: 'active' | 'inactive' | 'deleted' | 'restricted';
    account_type: 'human' | 'bot' | 'app';
    permissions_level: 'owner' | 'admin' | 'member' | 'guest' | 'restricted';
    workspace_role: string;
  };
  profile_analysis: {
    profile_completeness_score: number; // 0-100
    has_display_name: boolean;
    has_real_name: boolean;
    has_title: boolean;
    has_phone: boolean;
    has_profile_image: boolean;
    profile_fields_count: number;
  };
  security_assessment: {
    has_2fa: boolean;
    account_verification_level: 'high' | 'medium' | 'low';
    security_score: number; // 0-100
    potential_risks: string[];
  };
  engagement_insights: {
    timezone_info: {
      timezone: string | null;
      timezone_label: string | null;
      timezone_offset: number | null;
      local_time: string | null;
    };
    activity_indicators: {
      presence_status: string | null;
      last_activity_estimate: string;
      engagement_level: 'high' | 'medium' | 'low' | 'unknown';
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
    fields?: any;
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
}

/**
 * Lookup result interface
 */
interface LookupResult {
  success: boolean;
  user?: EnhancedUser;
  email_searched: string;
  lookup_timestamp: string;
  analytics?: UserLookupAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackUsersLookupByEmailTool: MCPTool = {
  name: 'slack_users_lookup_by_email',
  description: 'Find users by email with comprehensive analytics, verification insights, and security assessment',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'Email address to lookup (must be a valid email format)',
        format: 'email',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive lookup analytics and user intelligence',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for user management and security',
        default: true,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include real-time presence information for the user',
        default: false,
      },
      verify_email_format: {
        type: 'boolean',
        description: 'Perform email format validation before lookup',
        default: true,
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Perform detailed user profile and security analysis',
        default: false,
      },
    },
    required: ['email'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackUsersLookupByEmailArgs;
      const client = slackClient.getClient();
      
      let userLookupAnalytics: UserLookupAnalytics = {
        lookup_metadata: {
          email_searched: validatedArgs.email,
          lookup_timestamp: new Date().toISOString(),
          lookup_success: false,
          lookup_confidence: 'low',
        },
        email_verification: {
          format_valid: false,
          domain_analysis: {
            domain: '',
            is_common_provider: false,
            is_business_domain: false,
          },
          email_status: 'invalid',
        },
        user_intelligence: {
          user_found: false,
          account_status: 'inactive',
          account_type: 'human',
          permissions_level: 'member',
          workspace_role: 'unknown',
        },
        profile_analysis: {
          profile_completeness_score: 0,
          has_display_name: false,
          has_real_name: false,
          has_title: false,
          has_phone: false,
          has_profile_image: false,
          profile_fields_count: 0,
        },
        security_assessment: {
          has_2fa: false,
          account_verification_level: 'low',
          security_score: 0,
          potential_risks: [],
        },
        engagement_insights: {
          timezone_info: {
            timezone: null,
            timezone_label: null,
            timezone_offset: null,
            local_time: null,
          },
          activity_indicators: {
            presence_status: null,
            last_activity_estimate: 'unknown',
            engagement_level: 'unknown',
          },
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];

      // Step 1: Email format validation
      if (validatedArgs.verify_email_format) {
        const emailAnalysis = this.analyzeEmail(validatedArgs.email);
        userLookupAnalytics.email_verification = emailAnalysis;
        
        if (!emailAnalysis.format_valid) {
          warnings.push('Email format appears invalid but proceeding with lookup');
        }
      }

      // Step 2: Perform user lookup
      let user: EnhancedUser | undefined;
      let lookupSuccess = false;
      
      try {
        const lookupResult = await client.users.lookupByEmail({
          email: validatedArgs.email,
        });

        if (lookupResult.ok && lookupResult.user) {
          user = lookupResult.user as EnhancedUser;
          lookupSuccess = true;
          userLookupAnalytics.lookup_metadata.lookup_success = true;
          userLookupAnalytics.lookup_metadata.lookup_confidence = 'high';
        } else {
          warnings.push(`User lookup failed: ${lookupResult.error || 'User not found'}`);
        }
      } catch (error) {
        warnings.push('User lookup API call failed');
      }

      // Step 3: Get presence information if requested and user found
      if (validatedArgs.include_presence && user) {
        try {
          const presenceResult = await client.users.getPresence({
            user: user.id,
          });
          
          if (presenceResult.ok) {
            user.presence = presenceResult.presence;
          }
        } catch (error) {
          warnings.push('Could not retrieve presence information');
        }
      }

      // Step 4: Generate analytics
      if (validatedArgs.include_analytics) {
        userLookupAnalytics = this.generateUserLookupAnalytics(
          validatedArgs.email,
          user,
          lookupSuccess,
          validatedArgs
        );
      }

      // Step 5: Generate recommendations
      if (validatedArgs.include_recommendations) {
        userLookupAnalytics.recommendations = this.generateRecommendations(
          userLookupAnalytics,
          user,
          validatedArgs
        );
      }

      userLookupAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_users_lookup_by_email', args, duration);

      return {
        success: true,
        data: {
          success: lookupSuccess,
          user: user,
          email_searched: validatedArgs.email,
          lookup_timestamp: new Date().toISOString(),
          analytics: validatedArgs.include_analytics ? userLookupAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? userLookupAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as LookupResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'user_lookup_by_email',
          email_searched: validatedArgs.email,
          user_found: lookupSuccess,
          user_id: user?.id,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_users_lookup_by_email', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_users_lookup_by_email',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Analyze email format and domain
   */
  analyzeEmail(email: string): UserLookupAnalytics['email_verification'] {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const formatValid = emailRegex.test(email);
    
    let domain = '';
    let isCommonProvider = false;
    let isBusinessDomain = false;
    
    if (formatValid) {
      domain = email.split('@')[1].toLowerCase();
      
      const commonProviders = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
        'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
      ];
      
      isCommonProvider = commonProviders.includes(domain);
      isBusinessDomain = !isCommonProvider && !domain.includes('.');
    }
    
    return {
      format_valid: formatValid,
      domain_analysis: {
        domain: domain,
        is_common_provider: isCommonProvider,
        is_business_domain: isBusinessDomain,
      },
      email_status: formatValid ? 'verified' : 'invalid',
    };
  },

  /**
   * Generate comprehensive user lookup analytics
   */
  generateUserLookupAnalytics(
    email: string,
    user: EnhancedUser | undefined,
    lookupSuccess: boolean,
    args: SlackUsersLookupByEmailArgs
  ): UserLookupAnalytics {
    const analytics: UserLookupAnalytics = {
      lookup_metadata: {
        email_searched: email,
        lookup_timestamp: new Date().toISOString(),
        lookup_success: lookupSuccess,
        lookup_confidence: lookupSuccess ? 'high' : 'low',
      },
      email_verification: this.analyzeEmail(email),
      user_intelligence: {
        user_found: !!user,
        account_status: user?.deleted ? 'deleted' : user ? 'active' : 'inactive',
        account_type: user?.is_bot ? 'bot' : user?.is_app_user ? 'app' : 'human',
        permissions_level: this.determinePermissionLevel(user),
        workspace_role: this.determineWorkspaceRole(user),
      },
      profile_analysis: this.analyzeProfile(user),
      security_assessment: this.assessSecurity(user),
      engagement_insights: this.analyzeEngagement(user),
      recommendations: [],
      warnings: [],
    };

    return analytics;
  },

  /**
   * Determine user permission level
   */
  determinePermissionLevel(user: EnhancedUser | undefined): UserLookupAnalytics['user_intelligence']['permissions_level'] {
    if (!user) return 'member';
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
  determineWorkspaceRole(user: EnhancedUser | undefined): string {
    if (!user) return 'unknown';
    if (user.is_primary_owner) return 'Primary Owner';
    if (user.is_owner) return 'Owner';
    if (user.is_admin) return 'Admin';
    if (user.is_bot) return 'Bot';
    if (user.is_app_user) return 'App User';
    if (user.is_ultra_restricted) return 'Single Channel Guest';
    if (user.is_restricted) return 'Multi Channel Guest';
    return 'Member';
  },

  /**
   * Analyze user profile completeness
   */
  analyzeProfile(user: EnhancedUser | undefined): UserLookupAnalytics['profile_analysis'] {
    if (!user) {
      return {
        profile_completeness_score: 0,
        has_display_name: false,
        has_real_name: false,
        has_title: false,
        has_phone: false,
        has_profile_image: false,
        profile_fields_count: 0,
      };
    }

    const hasDisplayName = !!(user.profile?.display_name && user.profile.display_name.trim());
    const hasRealName = !!(user.profile?.real_name && user.profile.real_name.trim());
    const hasTitle = !!(user.profile?.title && user.profile.title.trim());
    const hasPhone = !!(user.profile?.phone && user.profile.phone.trim());
    const hasProfileImage = !!(user.profile?.image_original || user.profile?.avatar_hash);
    
    const profileFieldsCount = Object.keys(user.profile?.fields || {}).length;
    
    // Calculate completeness score
    let score = 0;
    if (hasDisplayName) score += 20;
    if (hasRealName) score += 20;
    if (hasTitle) score += 15;
    if (hasPhone) score += 10;
    if (hasProfileImage) score += 15;
    if (profileFieldsCount > 0) score += Math.min(profileFieldsCount * 5, 20);
    
    return {
      profile_completeness_score: Math.min(score, 100),
      has_display_name: hasDisplayName,
      has_real_name: hasRealName,
      has_title: hasTitle,
      has_phone: hasPhone,
      has_profile_image: hasProfileImage,
      profile_fields_count: profileFieldsCount,
    };
  },

  /**
   * Assess user security
   */
  assessSecurity(user: EnhancedUser | undefined): UserLookupAnalytics['security_assessment'] {
    if (!user) {
      return {
        has_2fa: false,
        account_verification_level: 'low',
        security_score: 0,
        potential_risks: ['User not found'],
      };
    }

    const has2FA = !!user.has_2fa;
    const isEmailConfirmed = !!user.is_email_confirmed;
    const isDeleted = !!user.deleted;
    const isRestricted = !!(user.is_restricted || user.is_ultra_restricted);
    
    let securityScore = 50; // Base score
    if (has2FA) securityScore += 30;
    if (isEmailConfirmed) securityScore += 10;
    if (!isDeleted) securityScore += 10;
    
    const potentialRisks: string[] = [];
    if (!has2FA) potentialRisks.push('No two-factor authentication enabled');
    if (!isEmailConfirmed) potentialRisks.push('Email address not confirmed');
    if (isDeleted) potentialRisks.push('Account is deleted');
    if (isRestricted) potentialRisks.push('Account has restricted access');
    
    const verificationLevel: 'high' | 'medium' | 'low' = 
      securityScore >= 80 ? 'high' : securityScore >= 60 ? 'medium' : 'low';
    
    return {
      has_2fa: has2FA,
      account_verification_level: verificationLevel,
      security_score: Math.min(securityScore, 100),
      potential_risks: potentialRisks,
    };
  },

  /**
   * Analyze user engagement
   */
  analyzeEngagement(user: EnhancedUser | undefined): UserLookupAnalytics['engagement_insights'] {
    if (!user) {
      return {
        timezone_info: {
          timezone: null,
          timezone_label: null,
          timezone_offset: null,
          local_time: null,
        },
        activity_indicators: {
          presence_status: null,
          last_activity_estimate: 'unknown',
          engagement_level: 'unknown',
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

    // Estimate engagement level based on available data
    let engagementLevel: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
    if (user.presence === 'active') engagementLevel = 'high';
    else if (user.presence === 'away') engagementLevel = 'medium';
    else if (user.deleted) engagementLevel = 'low';

    return {
      timezone_info: {
        timezone: user.tz || null,
        timezone_label: user.tz_label || null,
        timezone_offset: user.tz_offset || null,
        local_time: localTime,
      },
      activity_indicators: {
        presence_status: user.presence || null,
        last_activity_estimate: user.updated ? new Date(user.updated * 1000).toISOString() : 'unknown',
        engagement_level: engagementLevel,
      },
    };
  },

  /**
   * Generate recommendations for user management and security
   */
  generateRecommendations(
    analytics: UserLookupAnalytics,
    user: EnhancedUser | undefined,
    args: SlackUsersLookupByEmailArgs
  ): string[] {
    const recommendations: string[] = [];

    // User found recommendations
    if (analytics.user_intelligence.user_found && user) {
      // Profile completeness recommendations
      if (analytics.profile_analysis.profile_completeness_score < 50) {
        recommendations.push('User profile is incomplete - encourage them to fill out their profile information');
      } else if (analytics.profile_analysis.profile_completeness_score > 80) {
        recommendations.push('User has a well-completed profile - great for team collaboration!');
      }

      // Security recommendations
      if (!analytics.security_assessment.has_2fa) {
        recommendations.push('User does not have 2FA enabled - recommend enabling two-factor authentication for security');
      }

      if (analytics.security_assessment.security_score < 60) {
        recommendations.push('User has low security score - review security settings and encourage best practices');
      }

      // Permission level recommendations
      if (analytics.user_intelligence.permissions_level === 'admin' || analytics.user_intelligence.permissions_level === 'owner') {
        recommendations.push('User has elevated permissions - ensure they follow admin security best practices');
      }

      // Account status recommendations
      if (analytics.user_intelligence.account_status === 'deleted') {
        recommendations.push('User account is deleted - consider if this user needs to be reactivated');
      }

      // Engagement recommendations
      if (analytics.engagement_insights.activity_indicators.engagement_level === 'low') {
        recommendations.push('User shows low engagement - consider reaching out to ensure they have what they need');
      }

      // Email domain recommendations
      if (analytics.email_verification.domain_analysis.is_common_provider) {
        recommendations.push('User uses a common email provider - verify this is appropriate for your organization');
      }
    } else {
      // User not found recommendations
      recommendations.push('User not found with this email - verify the email address or check if they need to be invited');
      
      if (analytics.email_verification.format_valid) {
        recommendations.push('Email format is valid - consider sending an invitation to this email address');
      } else {
        recommendations.push('Email format appears invalid - verify the correct email address');
      }
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('User lookup completed successfully - no specific actions needed');
    }

    return recommendations;
  },
};

export default slackUsersLookupByEmailTool;
