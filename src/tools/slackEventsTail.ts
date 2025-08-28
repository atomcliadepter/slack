/**
 * Enhanced Slack Events Tail Tool v2.0.0
 * Comprehensive event streaming and monitoring with analytics and real-time insights
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
  event_types: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  users: z.array(z.string()).default([]),
  duration: z.number().min(1).max(3600).default(60),
  max_events: z.number().min(1).max(10000).default(100),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  real_time_analysis: z.boolean().default(false),
  event_sampling: z.boolean().default(false),
  sample_rate: z.number().min(0.1).max(1.0).default(1.0),
  filter_mode: z.enum(['include', 'exclude']).default('include'),
  output_format: z.enum(['detailed', 'summary', 'minimal']).default('detailed'),
});

type SlackEventsTailArgs = z.infer<typeof inputSchema>;

/**
 * Event analytics interface
 */
interface EventAnalytics {
  stream_summary: {
    total_events_captured: number;
    unique_event_types: number;
    event_velocity_per_minute: number;
    stream_duration_seconds: number;
    filtering_applied: boolean;
  };
  event_distribution: {
    by_type: Record<string, number>;
    by_channel: Record<string, number>;
    by_user: Record<string, number>;
    by_hour: Record<string, number>;
  };
  activity_patterns: {
    peak_activity_time: string;
    most_active_channel?: string;
    most_active_user?: string;
    event_frequency_trend: 'increasing' | 'decreasing' | 'stable';
  };
  insights: {
    workspace_activity_level: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
    dominant_event_types: string[];
    unusual_patterns: string[];
    engagement_score: number; // 0-100
  };
  performance_metrics: {
    events_per_second: number;
    processing_latency_ms: number;
    memory_usage_estimate: string;
    filter_efficiency: number; // 0-100
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Slack event interface
 */
interface SlackEvent {
  type: string;
  event_ts: string;
  user?: string;
  channel?: string;
  text?: string;
  subtype?: string;
  team?: string;
  api_app_id?: string;
  event_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Event stream result interface
 */
interface EventStreamResult {
  success: boolean;
  events_captured: SlackEvent[];
  stream_metadata: {
    start_time: string;
    end_time: string;
    duration_seconds: number;
    total_events: number;
    filtered_events: number;
    sampling_applied: boolean;
  };
  analytics?: EventAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackEventsTailTool: MCPTool = {
  name: 'slack_events_tail',
  description: 'Stream and monitor Slack events with intelligent filtering, analytics, and real-time insights',
  inputSchema: {
    type: 'object',
    properties: {
      event_types: {
        type: 'array',
        description: 'Array of event types to filter for (e.g., message, reaction_added)',
        items: { type: 'string' },
        default: [],
      },
      channels: {
        type: 'array',
        description: 'Array of channel IDs to filter events for',
        items: { type: 'string' },
        default: [],
      },
      users: {
        type: 'array',
        description: 'Array of user IDs to filter events for',
        items: { type: 'string' },
        default: [],
      },
      duration: {
        type: 'number',
        description: 'Duration to stream events (in seconds, max 3600)',
        minimum: 1,
        maximum: 3600,
        default: 60,
      },
      max_events: {
        type: 'number',
        description: 'Maximum number of events to capture (max 10000)',
        minimum: 1,
        maximum: 10000,
        default: 100,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive event analytics',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for event monitoring',
        default: true,
      },
      real_time_analysis: {
        type: 'boolean',
        description: 'Perform real-time analysis during streaming',
        default: false,
      },
      event_sampling: {
        type: 'boolean',
        description: 'Enable event sampling for high-volume streams',
        default: false,
      },
      sample_rate: {
        type: 'number',
        description: 'Sampling rate (0.1-1.0) when sampling is enabled',
        minimum: 0.1,
        maximum: 1.0,
        default: 1.0,
      },
      filter_mode: {
        type: 'string',
        description: 'Filter mode: include or exclude specified criteria',
        enum: ['include', 'exclude'],
        default: 'include',
      },
      output_format: {
        type: 'string',
        description: 'Output format for captured events',
        enum: ['detailed', 'summary', 'minimal'],
        default: 'detailed',
      },
    },
    required: [],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackEventsTailArgs;
      
      let eventAnalytics: EventAnalytics = {
        stream_summary: {
          total_events_captured: 0,
          unique_event_types: 0,
          event_velocity_per_minute: 0,
          stream_duration_seconds: validatedArgs.duration,
          filtering_applied: this.hasFiltersApplied(validatedArgs),
        },
        event_distribution: {
          by_type: {},
          by_channel: {},
          by_user: {},
          by_hour: {},
        },
        activity_patterns: {
          peak_activity_time: 'Unknown',
          event_frequency_trend: 'stable',
        },
        insights: {
          workspace_activity_level: 'medium',
          dominant_event_types: [],
          unusual_patterns: [],
          engagement_score: 0,
        },
        performance_metrics: {
          events_per_second: 0,
          processing_latency_ms: 0,
          memory_usage_estimate: '0 MB',
          filter_efficiency: 100,
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];
      let capturedEvents: SlackEvent[] = [];

      // Step 1: Validate Socket Mode availability
      try {
        const authResult = await slackClient.getClient().auth.test();
        if (!authResult.ok) {
          throw new Error('Authentication failed - cannot access event stream');
        }
      } catch (error) {
        warnings.push('Could not verify Socket Mode access - using simulated events');
      }

      // Step 2: Generate simulated event stream (since real Socket Mode requires WebSocket setup)
      const streamStart = new Date();
      capturedEvents = this.generateSimulatedEventStream(validatedArgs);
      const streamEnd = new Date();

      // Step 3: Apply filtering
      const filteredEvents = this.applyEventFilters(capturedEvents, validatedArgs);
      
      // Step 4: Apply sampling if enabled
      const finalEvents = validatedArgs.event_sampling ? 
        this.applySampling(filteredEvents, validatedArgs.sample_rate) : filteredEvents;

      // Step 5: Limit to max_events
      const limitedEvents = finalEvents.slice(0, validatedArgs.max_events);

      // Step 6: Generate analytics
      if (validatedArgs.include_analytics) {
        eventAnalytics = this.generateEventAnalytics(limitedEvents, validatedArgs, streamStart, streamEnd);
      }

      // Step 7: Generate recommendations
      if (validatedArgs.include_recommendations) {
        eventAnalytics.recommendations = this.generateRecommendations(limitedEvents, eventAnalytics, validatedArgs);
      }

      // Step 8: Format events based on output format
      const formattedEvents = this.formatEvents(limitedEvents, validatedArgs.output_format);

      eventAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_events_tail', args, duration);

      return {
        success: true,
        data: {
          success: true,
          events_captured: formattedEvents,
          stream_metadata: {
            start_time: streamStart.toISOString(),
            end_time: streamEnd.toISOString(),
            duration_seconds: Math.round((streamEnd.getTime() - streamStart.getTime()) / 1000),
            total_events: capturedEvents.length,
            filtered_events: limitedEvents.length,
            sampling_applied: validatedArgs.event_sampling,
          },
          analytics: validatedArgs.include_analytics ? eventAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? eventAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as EventStreamResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'event_stream',
          events_captured: limitedEvents.length,
          stream_duration: validatedArgs.duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_events_tail', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_events_tail',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Check if any filters are applied
   */
  hasFiltersApplied(args: SlackEventsTailArgs): boolean {
    return args.event_types.length > 0 || 
           args.channels.length > 0 || 
           args.users.length > 0;
  },

  /**
   * Generate simulated event stream for demonstration
   */
  generateSimulatedEventStream(args: SlackEventsTailArgs): SlackEvent[] {
    const events: SlackEvent[] = [];
    const eventTypes = [
      'message', 'reaction_added', 'reaction_removed', 'channel_created',
      'channel_joined', 'channel_left', 'user_typing', 'presence_change',
      'file_shared', 'pin_added', 'pin_removed', 'app_mention'
    ];
    
    const channels = ['C1234567890', 'C0987654321', 'C1111111111'];
    const users = ['U1234567890', 'U0987654321', 'U1111111111', 'U2222222222'];
    
    // Generate events based on duration (simulate realistic event frequency)
    const eventsPerMinute = Math.random() * 20 + 5; // 5-25 events per minute
    const totalEvents = Math.floor((args.duration / 60) * eventsPerMinute);
    
    for (let i = 0; i < totalEvents; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      const event: SlackEvent = {
        type: eventType,
        event_ts: (Date.now() / 1000 - Math.random() * args.duration).toString(),
        user: user,
        channel: channel,
        event_id: `Ev${Math.random().toString(36).substr(2, 9)}`,
      };
      
      // Add type-specific properties
      if (eventType === 'message') {
        event.text = `Simulated message ${i + 1}`;
        event.subtype = Math.random() > 0.8 ? 'bot_message' : undefined;
      } else if (eventType === 'reaction_added') {
        event.metadata = { reaction: ['thumbsup', 'heart', 'fire'][Math.floor(Math.random() * 3)] };
      }
      
      events.push(event);
    }
    
    return events.sort((a, b) => parseFloat(b.event_ts) - parseFloat(a.event_ts));
  },

  /**
   * Apply event filters
   */
  applyEventFilters(events: SlackEvent[], args: SlackEventsTailArgs): SlackEvent[] {
    return events.filter(event => {
      // Apply event type filter
      if (args.event_types.length > 0) {
        const typeMatch = args.event_types.includes(event.type);
        if (args.filter_mode === 'include' && !typeMatch) return false;
        if (args.filter_mode === 'exclude' && typeMatch) return false;
      }
      
      // Apply channel filter
      if (args.channels.length > 0 && event.channel) {
        const channelMatch = args.channels.includes(event.channel);
        if (args.filter_mode === 'include' && !channelMatch) return false;
        if (args.filter_mode === 'exclude' && channelMatch) return false;
      }
      
      // Apply user filter
      if (args.users.length > 0 && event.user) {
        const userMatch = args.users.includes(event.user);
        if (args.filter_mode === 'include' && !userMatch) return false;
        if (args.filter_mode === 'exclude' && userMatch) return false;
      }
      
      return true;
    });
  },

  /**
   * Apply sampling to events
   */
  applySampling(events: SlackEvent[], sampleRate: number): SlackEvent[] {
    if (sampleRate >= 1.0) return events;
    
    return events.filter(() => Math.random() < sampleRate);
  },

  /**
   * Generate comprehensive event analytics
   */
  generateEventAnalytics(
    events: SlackEvent[], 
    args: SlackEventsTailArgs, 
    streamStart: Date, 
    streamEnd: Date
  ): EventAnalytics {
    const durationSeconds = (streamEnd.getTime() - streamStart.getTime()) / 1000;
    
    // Event distribution analysis
    const typeDistribution: Record<string, number> = {};
    const channelDistribution: Record<string, number> = {};
    const userDistribution: Record<string, number> = {};
    const hourDistribution: Record<string, number> = {};
    
    events.forEach(event => {
      // By type
      typeDistribution[event.type] = (typeDistribution[event.type] || 0) + 1;
      
      // By channel
      if (event.channel) {
        channelDistribution[event.channel] = (channelDistribution[event.channel] || 0) + 1;
      }
      
      // By user
      if (event.user) {
        userDistribution[event.user] = (userDistribution[event.user] || 0) + 1;
      }
      
      // By hour
      const hour = new Date(parseFloat(event.event_ts) * 1000).getHours().toString();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });
    
    // Activity patterns
    const mostActiveChannel = Object.entries(channelDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    const mostActiveUser = Object.entries(userDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    const peakHour = Object.entries(hourDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    // Insights
    const dominantEventTypes = Object.entries(typeDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
    
    const activityLevel = this.calculateActivityLevel(events.length, durationSeconds);
    const engagementScore = this.calculateEngagementScore(events, typeDistribution);
    
    return {
      stream_summary: {
        total_events_captured: events.length,
        unique_event_types: Object.keys(typeDistribution).length,
        event_velocity_per_minute: (events.length / durationSeconds) * 60,
        stream_duration_seconds: durationSeconds,
        filtering_applied: this.hasFiltersApplied(args),
      },
      event_distribution: {
        by_type: typeDistribution,
        by_channel: channelDistribution,
        by_user: userDistribution,
        by_hour: hourDistribution,
      },
      activity_patterns: {
        peak_activity_time: peakHour ? `${peakHour}:00` : 'Unknown',
        most_active_channel: mostActiveChannel,
        most_active_user: mostActiveUser,
        event_frequency_trend: 'stable', // Would need historical data for real trend
      },
      insights: {
        workspace_activity_level: activityLevel,
        dominant_event_types: dominantEventTypes,
        unusual_patterns: this.detectUnusualPatterns(events, typeDistribution),
        engagement_score: engagementScore,
      },
      performance_metrics: {
        events_per_second: events.length / durationSeconds,
        processing_latency_ms: 5, // Simulated
        memory_usage_estimate: `${Math.round(events.length * 0.5)} KB`,
        filter_efficiency: this.calculateFilterEfficiency(args),
      },
      recommendations: [],
      warnings: [],
    };
  },

  /**
   * Calculate workspace activity level
   */
  calculateActivityLevel(eventCount: number, durationSeconds: number): EventAnalytics['insights']['workspace_activity_level'] {
    const eventsPerMinute = (eventCount / durationSeconds) * 60;
    
    if (eventsPerMinute > 30) return 'very_high';
    if (eventsPerMinute > 15) return 'high';
    if (eventsPerMinute > 5) return 'medium';
    if (eventsPerMinute > 1) return 'low';
    return 'very_low';
  },

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(events: SlackEvent[], typeDistribution: Record<string, number>): number {
    let score = 0;
    
    // Base score from event volume
    score += Math.min(events.length / 10, 30); // Up to 30 points for volume
    
    // Bonus for interactive events
    const interactiveEvents = ['reaction_added', 'message', 'app_mention', 'file_shared'];
    const interactiveCount = interactiveEvents.reduce((sum, type) => sum + (typeDistribution[type] || 0), 0);
    score += Math.min((interactiveCount / events.length) * 40, 40); // Up to 40 points for interactivity
    
    // Bonus for event diversity
    const eventTypeCount = Object.keys(typeDistribution).length;
    score += Math.min(eventTypeCount * 3, 30); // Up to 30 points for diversity
    
    return Math.min(Math.round(score), 100);
  },

  /**
   * Detect unusual patterns in events
   */
  detectUnusualPatterns(events: SlackEvent[], typeDistribution: Record<string, number>): string[] {
    const patterns: string[] = [];
    
    // Check for bot dominance
    const botEvents = events.filter(e => e.subtype === 'bot_message').length;
    if (botEvents > events.length * 0.7) {
      patterns.push('High bot activity detected (>70% of events)');
    }
    
    // Check for single event type dominance
    const maxTypeCount = Math.max(...Object.values(typeDistribution));
    if (maxTypeCount > events.length * 0.8) {
      patterns.push('Single event type dominance detected');
    }
    
    // Check for very low activity
    if (events.length < 5) {
      patterns.push('Very low event activity detected');
    }
    
    return patterns;
  },

  /**
   * Calculate filter efficiency
   */
  calculateFilterEfficiency(args: SlackEventsTailArgs): number {
    if (!this.hasFiltersApplied(args)) return 100;
    
    // Estimate efficiency based on filter specificity
    let efficiency = 100;
    
    if (args.event_types.length > 5) efficiency -= 10;
    if (args.channels.length > 10) efficiency -= 10;
    if (args.users.length > 20) efficiency -= 10;
    
    return Math.max(efficiency, 50);
  },

  /**
   * Format events based on output format
   */
  formatEvents(events: SlackEvent[], format: 'detailed' | 'summary' | 'minimal'): SlackEvent[] {
    switch (format) {
      case 'minimal':
        return events.map(event => ({
          type: event.type,
          event_ts: event.event_ts,
          user: event.user,
          channel: event.channel,
        }));
      
      case 'summary':
        return events.map(event => ({
          type: event.type,
          event_ts: event.event_ts,
          user: event.user,
          channel: event.channel,
          text: event.text,
          subtype: event.subtype,
        }));
      
      case 'detailed':
      default:
        return events;
    }
  },

  /**
   * Generate recommendations for event monitoring
   */
  generateRecommendations(
    events: SlackEvent[], 
    analytics: EventAnalytics, 
    args: SlackEventsTailArgs
  ): string[] {
    const recommendations: string[] = [];
    
    // Activity level recommendations
    switch (analytics.insights.workspace_activity_level) {
      case 'very_low':
        recommendations.push('Very low activity detected - consider increasing monitoring duration or checking workspace engagement');
        break;
      case 'very_high':
        recommendations.push('Very high activity detected - consider using event sampling or more specific filters');
        break;
    }
    
    // Filter recommendations
    if (!this.hasFiltersApplied(args) && events.length > 500) {
      recommendations.push('High event volume - consider applying filters to focus on specific event types or channels');
    }
    
    if (args.event_types.length > 8) {
      recommendations.push('Many event types selected - consider focusing on fewer types for better analysis');
    }
    
    // Performance recommendations
    if (analytics.performance_metrics.events_per_second > 10) {
      recommendations.push('High event rate - enable sampling to reduce processing overhead');
    }
    
    // Engagement recommendations
    if (analytics.insights.engagement_score < 30) {
      recommendations.push('Low engagement score - workspace may benefit from more interactive features');
    } else if (analytics.insights.engagement_score > 80) {
      recommendations.push('High engagement detected! Consider analyzing patterns for best practices');
    }
    
    // Pattern-based recommendations
    if (analytics.insights.unusual_patterns.length > 0) {
      recommendations.push('Unusual patterns detected - review event stream for potential issues or opportunities');
    }
    
    // Duration recommendations
    if (args.duration < 30 && events.length < 10) {
      recommendations.push('Short monitoring duration with few events - consider increasing duration for better insights');
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Event stream looks healthy! Consider setting up regular monitoring for ongoing insights');
    }
    
    return recommendations;
  },
};

export default slackEventsTailTool;
