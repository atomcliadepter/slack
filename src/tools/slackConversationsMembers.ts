/**
 * Enhanced Slack Conversations Members Tool v2.0.0
 * Comprehensive channel member management with analytics and insights
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
  channel: z.string()
    .min(1, 'Channel ID or name is required')
    .refine(val => val.startsWith('C') || val.startsWith('#'), 'Channel must be a valid ID (C1234567890) or name (#general)'),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  include_presence: z.boolean().default(false),
  sort_by: z.enum(['name', 'join_date', 'activity', 'role']).default('name'),
  filter_by_role: z.enum(['admin', 'owner', 'member', 'guest', 'all']).default('all'),
  include_bots: z.boolean().default(true),
  detailed_analysis: z.boolean().default(false),
});

type SlackConversationsMembersArgs = z.infer<typeof inputSchema>;

/**
 * Member analytics interface
 */
interface MemberAnalytics {
  total_members: number;
  member_distribution: {
    admins: number;
    owners: number;
    members: number;
    guests: number;
    bots: number;
  };
  engagement_metrics: {
    average_join_age_days: number;
    active_members_estimate: number;
    member_diversity_score: number; // 0-100
  };
  channel_insights: {
    member_growth_trend: 'growing' | 'stable' | 'declining';
    optimal_size_assessment: 'too_small' | 'optimal' | 'too_large';
    collaboration_potential: number; // 0-100
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Enhanced member interface
 */
interface EnhancedMember {
  id: string;
  name?: string;
  real_name?: string;
  display_name?: string;
  is_admin?: boolean;
  is_owner?: boolean;
  is_bot?: boolean;
  is_guest?: boolean;
  is_restricted?: boolean;
  presence?: string;
  profile?: {
    email?: string;
    title?: string;
    phone?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
  };
  team_id?: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  deleted?: boolean;
  color?: string;
  updated?: number;
  has_2fa?: boolean;
  locale?: string;
  enterprise_user?: {
    id?: string;
    enterprise_id?: string;
    enterprise_name?: string;
  };
}

/**
 * Members result interface
 */
interface MembersResult {
  success: boolean;
  members: EnhancedMember[];
  channel_id: string;
  channel_name?: string;
  response_metadata?: {
    next_cursor?: string;
  };
  analytics?: MemberAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackConversationsMembersTool: MCPTool = {
  name: 'slack_conversations_members',
  description: 'List conversation members with comprehensive analytics, engagement insights, and management recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or name (#general) to get members for',
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving additional results',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of members to return (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive member analytics',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for member management',
        default: true,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include real-time presence information for members',
        default: false,
      },
      sort_by: {
        type: 'string',
        description: 'Sort members by specified criteria',
        enum: ['name', 'join_date', 'activity', 'role'],
        default: 'name',
      },
      filter_by_role: {
        type: 'string',
        description: 'Filter members by role type',
        enum: ['admin', 'owner', 'member', 'guest', 'all'],
        default: 'all',
      },
      include_bots: {
        type: 'boolean',
        description: 'Include bot users in results',
        default: true,
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Perform detailed member analysis (may take longer)',
        default: false,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackConversationsMembersArgs;
      const client = slackClient.getClient();
      
      let memberAnalytics: MemberAnalytics = {
        total_members: 0,
        member_distribution: {
          admins: 0,
          owners: 0,
          members: 0,
          guests: 0,
          bots: 0,
        },
        engagement_metrics: {
          average_join_age_days: 0,
          active_members_estimate: 0,
          member_diversity_score: 0,
        },
        channel_insights: {
          member_growth_trend: 'stable',
          optimal_size_assessment: 'optimal',
          collaboration_potential: 0,
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];
      let channelId = validatedArgs.channel;
      let channelName: string | undefined;

      // Step 1: Resolve channel ID if name provided
      if (validatedArgs.channel.startsWith('#')) {
        try {
          const channelNameToResolve = validatedArgs.channel.slice(1);
          const channelsResult = await client.conversations.list({
            types: 'public_channel,private_channel',
            limit: 1000,
          });
          
          if (channelsResult.ok && channelsResult.channels) {
            const channel = channelsResult.channels.find((ch: any) => ch.name === channelNameToResolve);
            if (channel && channel.id) {
              channelId = channel.id;
              channelName = channel.name || undefined;
            } else {
              throw new Error(`Channel #${channelNameToResolve} not found`);
            }
          }
        } catch (error) {
          throw new Error(`Failed to resolve channel name: ${validatedArgs.channel}`);
        }
      }

      // Step 2: Get channel members
      const membersResult = await client.conversations.members({
        channel: channelId,
        cursor: validatedArgs.cursor,
        limit: validatedArgs.limit,
      });

      if (!membersResult.ok) {
        throw new Error(`Failed to get channel members: ${membersResult.error}`);
      }

      const memberIds = membersResult.members || [];
      
      // Step 3: Get detailed user information
      const enhancedMembers: EnhancedMember[] = [];
      
      if (memberIds.length > 0) {
        // Batch user info requests for efficiency
        const userInfoPromises = memberIds.map(async (userId: string) => {
          try {
            const userResult = await client.users.info({ user: userId });
            if (userResult.ok && userResult.user) {
              const user = userResult.user;
              
              const enhancedMember: EnhancedMember = {
                id: user.id || userId, // Fallback to userId if user.id is undefined
                name: user.name,
                real_name: user.real_name,
                display_name: user.profile?.display_name || undefined,
                is_admin: user.is_admin,
                is_owner: user.is_owner,
                is_bot: user.is_bot,
                is_guest: user.is_restricted || user.is_ultra_restricted,
                is_restricted: user.is_restricted,
                team_id: user.team_id,
                tz: user.tz,
                tz_label: user.tz_label,
                tz_offset: user.tz_offset,
                deleted: user.deleted,
                color: user.color,
                updated: user.updated,
                has_2fa: user.has_2fa,
                locale: user.locale,
                profile: {
                  email: user.profile?.email,
                  title: user.profile?.title,
                  phone: user.profile?.phone,
                  image_24: user.profile?.image_24,
                  image_32: user.profile?.image_32,
                  image_48: user.profile?.image_48,
                  image_72: user.profile?.image_72,
                },
              };

              // Add presence information if requested
              if (validatedArgs.include_presence) {
                try {
                  const presenceResult = await client.users.getPresence({ user: userId });
                  if (presenceResult.ok) {
                    enhancedMember.presence = presenceResult.presence;
                  }
                } catch (error) {
                  // Presence info is optional, continue without it
                }
              }

              return enhancedMember;
            }
          } catch (error) {
            warnings.push(`Could not retrieve info for user ${userId}`);
          }
          return null;
        });

        const userResults = await Promise.all(userInfoPromises);
        enhancedMembers.push(...userResults.filter((user): user is EnhancedMember => user !== null));
      }

      // Step 4: Apply filtering
      let filteredMembers = enhancedMembers;
      
      if (!validatedArgs.include_bots) {
        filteredMembers = filteredMembers.filter(member => !member.is_bot);
      }
      
      if (validatedArgs.filter_by_role !== 'all') {
        filteredMembers = filteredMembers.filter(member => {
          switch (validatedArgs.filter_by_role) {
            case 'admin': return member.is_admin;
            case 'owner': return member.is_owner;
            case 'member': return !member.is_admin && !member.is_owner && !member.is_guest;
            case 'guest': return member.is_guest;
            default: return true;
          }
        });
      }

      // Step 5: Apply sorting
      filteredMembers = this.sortMembers(filteredMembers, validatedArgs.sort_by);

      // Step 6: Generate analytics
      if (validatedArgs.include_analytics) {
        memberAnalytics = this.generateMemberAnalytics(enhancedMembers, channelId, validatedArgs);
      }

      // Step 7: Generate recommendations
      if (validatedArgs.include_recommendations) {
        memberAnalytics.recommendations = this.generateRecommendations(enhancedMembers, memberAnalytics, validatedArgs);
      }

      memberAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_members', args, duration);

      return {
        success: true,
        data: {
          success: true,
          members: filteredMembers,
          channel_id: channelId,
          channel_name: channelName,
          response_metadata: membersResult.response_metadata,
          analytics: validatedArgs.include_analytics ? memberAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? memberAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as MembersResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'members_list',
          channel_id: channelId,
          total_members: enhancedMembers.length,
          filtered_members: filteredMembers.length,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_members', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_members',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Sort members by specified criteria
   */
  sortMembers(members: EnhancedMember[], sortBy: string): EnhancedMember[] {
    return [...members].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.display_name || a.real_name || a.name || '').localeCompare(
            b.display_name || b.real_name || b.name || ''
          );
        case 'role':
          // Sort by role hierarchy: owner > admin > member > guest > bot
          const getRoleWeight = (member: EnhancedMember) => {
            if (member.is_owner) return 5;
            if (member.is_admin) return 4;
            if (member.is_bot) return 1;
            if (member.is_guest) return 2;
            return 3; // regular member
          };
          return getRoleWeight(b) - getRoleWeight(a);
        case 'join_date':
          // Sort by user creation/update time (newer first)
          return (b.updated || 0) - (a.updated || 0);
        default:
          return 0;
      }
    });
  },

  /**
   * Generate comprehensive member analytics
   */
  generateMemberAnalytics(
    members: EnhancedMember[], 
    channelId: string, 
    args: SlackConversationsMembersArgs
  ): MemberAnalytics {
    const analytics: MemberAnalytics = {
      total_members: members.length,
      member_distribution: {
        admins: members.filter(m => m.is_admin).length,
        owners: members.filter(m => m.is_owner).length,
        members: members.filter(m => !m.is_admin && !m.is_owner && !m.is_guest && !m.is_bot).length,
        guests: members.filter(m => m.is_guest).length,
        bots: members.filter(m => m.is_bot).length,
      },
      engagement_metrics: {
        average_join_age_days: 0,
        active_members_estimate: 0,
        member_diversity_score: 0,
      },
      channel_insights: {
        member_growth_trend: 'stable',
        optimal_size_assessment: 'optimal',
        collaboration_potential: 0,
      },
      recommendations: [],
      warnings: [],
    };

    // Calculate engagement metrics
    const activeMembers = members.filter(m => !m.deleted && !m.is_bot);
    analytics.engagement_metrics.active_members_estimate = activeMembers.length;

    // Calculate member diversity score
    const totalActive = activeMembers.length;
    if (totalActive > 0) {
      const timezones = new Set(activeMembers.map(m => m.tz).filter(Boolean));
      const diversityScore = Math.min((timezones.size / Math.max(totalActive * 0.3, 1)) * 100, 100);
      analytics.engagement_metrics.member_diversity_score = Math.round(diversityScore);
    }

    // Assess optimal size
    if (totalActive < 3) {
      analytics.channel_insights.optimal_size_assessment = 'too_small';
    } else if (totalActive > 50) {
      analytics.channel_insights.optimal_size_assessment = 'too_large';
    }

    // Calculate collaboration potential
    const adminRatio = (analytics.member_distribution.admins + analytics.member_distribution.owners) / totalActive;
    const diversityFactor = analytics.engagement_metrics.member_diversity_score / 100;
    const sizeFactor = Math.min(totalActive / 10, 1); // Optimal around 10 members
    
    analytics.channel_insights.collaboration_potential = Math.round(
      ((1 - Math.abs(adminRatio - 0.2)) * 40 + // Optimal admin ratio around 20%
       diversityFactor * 30 + // Diversity bonus
       sizeFactor * 30) // Size factor
    );

    return analytics;
  },

  /**
   * Generate recommendations for member management
   */
  generateRecommendations(
    members: EnhancedMember[], 
    analytics: MemberAnalytics, 
    args: SlackConversationsMembersArgs
  ): string[] {
    const recommendations: string[] = [];

    // Size-based recommendations
    if (analytics.channel_insights.optimal_size_assessment === 'too_small') {
      recommendations.push('Channel has few members - consider inviting more relevant team members');
    } else if (analytics.channel_insights.optimal_size_assessment === 'too_large') {
      recommendations.push('Large channel detected - consider creating focused sub-channels for better collaboration');
    }

    // Role distribution recommendations
    const totalActive = analytics.engagement_metrics.active_members_estimate;
    const adminCount = analytics.member_distribution.admins + analytics.member_distribution.owners;
    
    if (totalActive > 0) {
      const adminRatio = adminCount / totalActive;
      if (adminRatio > 0.4) {
        recommendations.push('High admin-to-member ratio - consider reducing admin privileges for better governance');
      } else if (adminRatio < 0.1 && totalActive > 10) {
        recommendations.push('Consider adding more admins to help manage this larger channel');
      }
    }

    // Bot recommendations
    if (analytics.member_distribution.bots > analytics.member_distribution.members) {
      recommendations.push('More bots than humans detected - review bot necessity and permissions');
    }

    // Guest recommendations
    if (analytics.member_distribution.guests > totalActive * 0.3) {
      recommendations.push('High number of guests - ensure proper access controls and consider converting frequent collaborators to members');
    }

    // Diversity recommendations
    if (analytics.engagement_metrics.member_diversity_score < 30) {
      recommendations.push('Low member diversity - consider including team members from different timezones or departments');
    }

    // Collaboration potential recommendations
    if (analytics.channel_insights.collaboration_potential < 50) {
      recommendations.push('Low collaboration potential - review member composition and channel purpose alignment');
    } else if (analytics.channel_insights.collaboration_potential > 80) {
      recommendations.push('Excellent collaboration potential! Consider this channel as a model for others');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Channel member composition looks well-balanced!');
    }

    return recommendations;
  },
};

export default slackConversationsMembersTool;
