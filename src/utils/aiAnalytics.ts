/**
 * AI Analytics Module for Enhanced MCP Slack SDK
 * Provides intelligent analysis and insights for Slack data
 */

import { slackClient } from './slackClient';
import { logger } from './logger';

export interface ReadActivityAnalysis {
  read_count: number;
  unread_count: number;
  last_read: string;
  reading_velocity: number;
  efficiency_score: number;
  catch_up_score: number;
  engagement_risk: 'low' | 'medium' | 'high';
}

export interface EngagementImpactAnalysis {
  impact_score: number;
  engagement_change: number;
  participation_rate: number;
  missed_interactions: number;
  social_signals: number;
  influence_metrics: {
    reach: number;
    resonance: number;
    relevance: number;
  };
}

export interface UnreadMessagesAnalysis {
  unread_count: number;
  priority_messages: number;
  estimated_read_time: number;
  content_categories: Record<string, number>;
  urgency_distribution: Record<string, number>;
  key_participants: string[];
}

export interface ChannelActivityAnalysis {
  daily_messages: number;
  active_users: number;
  peak_hours: string[];
  activity_trend: 'increasing' | 'decreasing' | 'stable';
  engagement_patterns: {
    high_engagement_periods: string[];
    low_engagement_periods: string[];
    average_response_time: number;
  };
}

export interface ReadBehaviorAnalysis {
  read_pattern: 'sequential' | 'selective' | 'batch' | 'sporadic';
  read_speed: number;
  comprehension_score: number;
  attention_span: number;
  preferred_times: string[];
  engagement_depth: 'surface' | 'moderate' | 'deep';
}

/**
 * Analyzes read activity patterns for a channel
 */
export async function analyzeReadActivity(channelId: string, timestamp: string): Promise<ReadActivityAnalysis> {
  try {
    const startTime = Date.now();
    
    // Get recent channel history
    const history = await slackClient.getClient().conversations.history({
      channel: channelId,
      latest: timestamp,
      limit: 100,
    });

    const messages = history.messages || [];
    const markedTime = parseFloat(timestamp);
    const now = Date.now() / 1000;
    
    // Calculate read metrics
    const unreadMessages = messages.filter(m => m.ts && parseFloat(m.ts) > markedTime);
    const readMessages = messages.filter(m => m.ts && parseFloat(m.ts) <= markedTime);
    
    // Calculate reading velocity (messages per hour)
    const timeSpan = Math.max(1, (now - markedTime) / 3600); // hours
    const readingVelocity = readMessages.length / timeSpan;
    
    // Calculate efficiency score based on message complexity and read speed
    const avgMessageLength = readMessages.reduce((sum, m) => sum + (m.text?.length || 0), 0) / Math.max(1, readMessages.length);
    const complexityFactor = Math.min(2, avgMessageLength / 100); // Normalize to 0-2
    const efficiencyScore = Math.min(100, (readingVelocity * 20) / complexityFactor);
    
    // Calculate catch-up score
    const timeSinceLastRead = (now - markedTime) / 60; // minutes
    const catchUpScore = Math.max(0, 100 - (timeSinceLastRead * 2)); // Decreases over time
    
    // Determine engagement risk
    const importantUnread = unreadMessages.filter(m => 
      (m.reactions && m.reactions.length > 0) || 
      (m.reply_count && m.reply_count > 0) || 
      m.text?.includes('@channel') || 
      m.text?.includes('@here') ||
      m.text?.includes('<@')
    ).length;
    
    let engagementRisk: 'low' | 'medium' | 'high' = 'low';
    if (importantUnread > 5 || unreadMessages.length > 50) engagementRisk = 'high';
    else if (importantUnread > 2 || unreadMessages.length > 20) engagementRisk = 'medium';
    
    const duration = Date.now() - startTime;
    logger.info('Read activity analysis completed', { 
      channelId, 
      duration, 
      messagesAnalyzed: messages.length 
    });
    
    return {
      read_count: readMessages.length,
      unread_count: unreadMessages.length,
      last_read: new Date(markedTime * 1000).toISOString(),
      reading_velocity: Math.round(readingVelocity * 100) / 100,
      efficiency_score: Math.round(efficiencyScore),
      catch_up_score: Math.round(catchUpScore),
      engagement_risk: engagementRisk,
    };
    
  } catch (error) {
    logger.error('Failed to analyze read activity', { channelId, timestamp, error });
    return {
      read_count: 0,
      unread_count: 0,
      last_read: new Date().toISOString(),
      reading_velocity: 0,
      efficiency_score: 0,
      catch_up_score: 0,
      engagement_risk: 'low',
    };
  }
}

/**
 * Analyzes engagement impact of channel activity
 */
export async function analyzeEngagementImpact(channelId: string, timestamp: string): Promise<EngagementImpactAnalysis> {
  try {
    const startTime = Date.now();
    const markedTime = parseFloat(timestamp);
    
    // Get messages before and after the timestamp
    const [beforeHistory, afterHistory] = await Promise.all([
      slackClient.getClient().conversations.history({
        channel: channelId,
        latest: timestamp,
        limit: 50,
      }),
      slackClient.getClient().conversations.history({
        channel: channelId,
        oldest: timestamp,
        limit: 50,
      }),
    ]);

    const beforeMessages = beforeHistory.messages || [];
    const afterMessages = afterHistory.messages || [];
    
    // Calculate engagement metrics
    const beforeEngagement = calculateMessageEngagement(beforeMessages);
    const afterEngagement = calculateMessageEngagement(afterMessages);
    
    const engagementChange = afterEngagement - beforeEngagement;
    const impactScore = Math.abs(engagementChange) * 10; // Scale impact
    
    // Calculate participation rate
    const uniqueUsers = new Set([
      ...beforeMessages.map(m => m.user).filter(Boolean),
      ...afterMessages.map(m => m.user).filter(Boolean),
    ]);
    const participationRate = (uniqueUsers.size / Math.max(1, beforeMessages.length + afterMessages.length)) * 100;
    
    // Calculate missed interactions
    const missedInteractions = afterMessages.reduce((sum, m) => 
      sum + (m.reactions?.length || 0) + (m.reply_count || 0), 0
    );
    
    // Calculate social signals
    const socialSignals = afterMessages.reduce((sum, m) => 
      sum + (m.reactions?.reduce((rSum, r) => rSum + (r.count || 0), 0) || 0), 0
    );
    
    // Calculate influence metrics
    const reach = uniqueUsers.size;
    const resonance = socialSignals / Math.max(1, afterMessages.length);
    const relevance = afterMessages.filter(m => 
      m.text?.includes('@') || (m.reactions && m.reactions.length > 0)
    ).length / Math.max(1, afterMessages.length) * 100;
    
    const duration = Date.now() - startTime;
    logger.info('Engagement impact analysis completed', { 
      channelId, 
      duration, 
      impactScore 
    });
    
    return {
      impact_score: Math.round(impactScore),
      engagement_change: Math.round(engagementChange * 100) / 100,
      participation_rate: Math.round(participationRate * 100) / 100,
      missed_interactions: missedInteractions,
      social_signals: socialSignals,
      influence_metrics: {
        reach: reach,
        resonance: Math.round(resonance * 100) / 100,
        relevance: Math.round(relevance * 100) / 100,
      },
    };
    
  } catch (error) {
    logger.error('Failed to analyze engagement impact', { channelId, timestamp, error });
    return {
      impact_score: 0,
      engagement_change: 0,
      participation_rate: 0,
      missed_interactions: 0,
      social_signals: 0,
      influence_metrics: { reach: 0, resonance: 0, relevance: 0 },
    };
  }
}

/**
 * Analyzes unread messages in a channel
 */
export async function analyzeUnreadMessages(channelId: string, timestamp: string): Promise<UnreadMessagesAnalysis> {
  try {
    const startTime = Date.now();
    
    // Get unread messages
    const history = await slackClient.getClient().conversations.history({
      channel: channelId,
      oldest: timestamp,
      limit: 100,
    });

    const unreadMessages = history.messages || [];
    
    // Categorize content
    const contentCategories = categorizeMessages(unreadMessages);
    
    // Analyze urgency
    const urgencyDistribution = analyzeUrgency(unreadMessages);
    
    // Identify key participants
    const participantCounts = unreadMessages.reduce((acc: Record<string, number>, m) => {
      if (m.user) acc[m.user] = (acc[m.user] || 0) + 1;
      return acc;
    }, {});
    
    const keyParticipants = Object.entries(participantCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([user]) => user);
    
    // Estimate read time (average 200 words per minute)
    const totalWords = unreadMessages.reduce((sum, m) => 
      sum + (m.text?.split(' ').length || 0), 0
    );
    const estimatedReadTime = Math.ceil(totalWords / 200); // minutes
    
    // Count priority messages
    const priorityMessages = unreadMessages.filter(m =>
      (m.reactions && m.reactions.length > 0) ||
      (m.reply_count && m.reply_count > 0) ||
      m.text?.includes('@channel') ||
      m.text?.includes('@here') ||
      m.text?.includes('<@') ||
      urgencyDistribution.high > 0
    ).length;
    
    const duration = Date.now() - startTime;
    logger.info('Unread messages analysis completed', { 
      channelId, 
      duration, 
      unreadCount: unreadMessages.length 
    });
    
    return {
      unread_count: unreadMessages.length,
      priority_messages: priorityMessages,
      estimated_read_time: estimatedReadTime,
      content_categories: contentCategories,
      urgency_distribution: urgencyDistribution,
      key_participants: keyParticipants,
    };
    
  } catch (error) {
    logger.error('Failed to analyze unread messages', { channelId, timestamp, error });
    return {
      unread_count: 0,
      priority_messages: 0,
      estimated_read_time: 0,
      content_categories: {},
      urgency_distribution: { low: 0, medium: 0, high: 0 },
      key_participants: [],
    };
  }
}

/**
 * Analyzes channel activity patterns
 */
export async function analyzeChannelActivity(channelId: string): Promise<ChannelActivityAnalysis> {
  try {
    const startTime = Date.now();
    
    // Get recent channel history
    const history = await slackClient.getClient().conversations.history({
      channel: channelId,
      limit: 200,
    });

    const messages = history.messages || [];
    const now = Date.now() / 1000;
    const oneDayAgo = now - 86400;
    
    // Filter to last 24 hours
    const dailyMessages = messages.filter(m => m.ts && parseFloat(m.ts) > oneDayAgo);
    
    // Count unique active users
    const activeUsers = new Set(dailyMessages.map(m => m.user).filter(Boolean)).size;
    
    // Analyze hourly distribution
    const hourlyDistribution = analyzeHourlyDistribution(dailyMessages);
    const peakHours = findPeakHours(hourlyDistribution);
    
    // Calculate activity trend
    const activityTrend = calculateActivityTrend(messages);
    
    // Analyze engagement patterns
    const engagementPatterns = analyzeEngagementPatterns(dailyMessages);
    
    const duration = Date.now() - startTime;
    logger.info('Channel activity analysis completed', { 
      channelId, 
      duration, 
      dailyMessages: dailyMessages.length 
    });
    
    return {
      daily_messages: dailyMessages.length,
      active_users: activeUsers,
      peak_hours: peakHours,
      activity_trend: activityTrend,
      engagement_patterns: engagementPatterns,
    };
    
  } catch (error) {
    logger.error('Failed to analyze channel activity', { channelId, error });
    return {
      daily_messages: 0,
      active_users: 0,
      peak_hours: [],
      activity_trend: 'stable',
      engagement_patterns: {
        high_engagement_periods: [],
        low_engagement_periods: [],
        average_response_time: 0,
      },
    };
  }
}

/**
 * Analyzes read behavior patterns
 */
export function analyzeReadBehavior(timestamp: string): ReadBehaviorAnalysis {
  try {
    const markedTime = parseFloat(timestamp);
    const now = Date.now() / 1000;
    const timeSinceRead = now - markedTime;
    
    // Determine read pattern based on timing
    let readPattern: 'sequential' | 'selective' | 'batch' | 'sporadic' = 'sequential';
    if (timeSinceRead > 86400) readPattern = 'batch'; // > 1 day
    else if (timeSinceRead > 3600) readPattern = 'selective'; // > 1 hour
    else if (timeSinceRead < 300) readPattern = 'sequential'; // < 5 minutes
    else readPattern = 'sporadic';
    
    // Calculate read speed (messages per minute, estimated)
    const readSpeed = Math.max(1, 60 / Math.max(1, timeSinceRead / 60));
    
    // Estimate comprehension score based on read speed and pattern
    let comprehensionScore = 100;
    if (readSpeed > 10) comprehensionScore = 60; // Too fast
    else if (readSpeed < 1) comprehensionScore = 80; // Too slow
    else comprehensionScore = 90; // Good pace
    
    // Calculate attention span (estimated based on read pattern)
    const attentionSpan = readPattern === 'sequential' ? 100 : 
                         readPattern === 'selective' ? 80 :
                         readPattern === 'batch' ? 60 : 40;
    
    // Determine preferred reading times
    const readHour = new Date(markedTime * 1000).getHours();
    const preferredTimes = categorizeReadingTime(readHour);
    
    // Determine engagement depth
    let engagementDepth: 'surface' | 'moderate' | 'deep' = 'moderate';
    if (readPattern === 'sequential' && readSpeed < 5) engagementDepth = 'deep';
    else if (readPattern === 'batch' || readSpeed > 8) engagementDepth = 'surface';
    
    return {
      read_pattern: readPattern,
      read_speed: Math.round(readSpeed * 100) / 100,
      comprehension_score: comprehensionScore,
      attention_span: attentionSpan,
      preferred_times: preferredTimes,
      engagement_depth: engagementDepth,
    };
    
  } catch (error) {
    logger.error('Failed to analyze read behavior', { timestamp, error });
    return {
      read_pattern: 'sequential',
      read_speed: 1,
      comprehension_score: 50,
      attention_span: 50,
      preferred_times: ['business_hours'],
      engagement_depth: 'moderate',
    };
  }
}

/**
 * Calculates engagement score for reactions and message
 */
export function calculateEngagementScore(reactions: any[], message: any): number {
  try {
    if (!reactions || reactions.length === 0) return 0;
    
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
    const reactionDiversity = reactions.length;
    const uniqueReactors = new Set(reactions.flatMap(r => r.users || [])).size;
    
    // Calculate message age factor (newer messages get slight boost)
    const messageAge = message.ts ? (Date.now() / 1000 - parseFloat(message.ts)) / 3600 : 0; // hours
    const ageFactor = Math.max(0.5, 1 - (messageAge / 168)); // Decay over a week
    
    // Calculate sentiment factor
    const sentimentFactor = calculateSentimentFactor(reactions);
    
    // Base score calculation
    let score = (totalReactions * 10) + (reactionDiversity * 5) + (uniqueReactors * 3);
    
    // Apply factors
    score = score * ageFactor * sentimentFactor;
    
    // Normalize to 0-100 scale
    return Math.min(100, Math.round(score));
    
  } catch (error) {
    logger.error('Failed to calculate engagement score', { error });
    return 0;
  }
}

// Helper functions

function calculateMessageEngagement(messages: any[]): number {
  return messages.reduce((sum, m) => {
    const reactions = (m.reactions || []).reduce((rSum: number, r: any) => rSum + (r.count || 0), 0);
    const replies = m.reply_count || 0;
    return sum + reactions + replies;
  }, 0) / Math.max(1, messages.length);
}

function categorizeMessages(messages: any[]): Record<string, number> {
  const categories: Record<string, number> = {
    questions: 0,
    announcements: 0,
    discussions: 0,
    files: 0,
    mentions: 0,
    other: 0,
  };
  
  messages.forEach(m => {
    const text = (m.text || '').toLowerCase();
    if (text.includes('?')) categories.questions++;
    else if (text.includes('@channel') || text.includes('@here')) categories.announcements++;
    else if (m.files && m.files.length > 0) categories.files++;
    else if (text.includes('<@')) categories.mentions++;
    else if (m.reply_count > 0) categories.discussions++;
    else categories.other++;
  });
  
  return categories;
}

function analyzeUrgency(messages: any[]): Record<string, number> {
  const urgency = { low: 0, medium: 0, high: 0 };
  
  messages.forEach(m => {
    const text = (m.text || '').toLowerCase();
    const hasUrgentKeywords = /urgent|asap|immediately|critical|emergency/.test(text);
    const hasMentions = text.includes('<@') || text.includes('@channel') || text.includes('@here');
    const hasReactions = (m.reactions || []).length > 0;
    
    if (hasUrgentKeywords || (hasMentions && hasReactions)) urgency.high++;
    else if (hasMentions || hasReactions) urgency.medium++;
    else urgency.low++;
  });
  
  return urgency;
}

function analyzeHourlyDistribution(messages: any[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  
  messages.forEach(m => {
    const hour = new Date(parseFloat(m.ts) * 1000).getHours();
    distribution[hour] = (distribution[hour] || 0) + 1;
  });
  
  return distribution;
}

function findPeakHours(hourlyDistribution: Record<number, number>): string[] {
  const entries = Object.entries(hourlyDistribution);
  if (entries.length === 0) return [];
  
  const maxCount = Math.max(...entries.map(([, count]) => count));
  const threshold = maxCount * 0.8; // Consider hours with 80%+ of peak activity
  
  return entries
    .filter(([, count]) => count >= threshold)
    .map(([hour]) => `${hour}:00`)
    .sort();
}

function calculateActivityTrend(messages: any[]): 'increasing' | 'decreasing' | 'stable' {
  if (messages.length < 20) return 'stable';
  
  const midpoint = Math.floor(messages.length / 2);
  const recentMessages = messages.slice(0, midpoint);
  const olderMessages = messages.slice(midpoint);
  
  const recentAvgTime = recentMessages.reduce((sum, m) => sum + parseFloat(m.ts), 0) / recentMessages.length;
  const olderAvgTime = olderMessages.reduce((sum, m) => sum + parseFloat(m.ts), 0) / olderMessages.length;
  
  const timeDiff = recentAvgTime - olderAvgTime;
  const expectedDiff = (Date.now() / 1000 - parseFloat(messages[messages.length - 1].ts)) / 2;
  
  if (timeDiff < expectedDiff * 0.8) return 'increasing';
  if (timeDiff > expectedDiff * 1.2) return 'decreasing';
  return 'stable';
}

function analyzeEngagementPatterns(messages: any[]): {
  high_engagement_periods: string[];
  low_engagement_periods: string[];
  average_response_time: number;
} {
  const hourlyEngagement: Record<number, number> = {};
  const responseTimes: number[] = [];
  
  messages.forEach((m, index) => {
    const hour = new Date(parseFloat(m.ts) * 1000).getHours();
    const engagement = (m.reactions || []).reduce((sum: number, r: any) => sum + (r.count || 0), 0) + (m.reply_count || 0);
    hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + engagement;
    
    // Calculate response time to previous message
    if (index > 0) {
      const prevTime = parseFloat(messages[index - 1].ts);
      const currentTime = parseFloat(m.ts);
      responseTimes.push(currentTime - prevTime);
    }
  });
  
  const avgEngagement = Object.values(hourlyEngagement).reduce((sum, eng) => sum + eng, 0) / Object.keys(hourlyEngagement).length;
  
  const highEngagementPeriods = Object.entries(hourlyEngagement)
    .filter(([, engagement]) => engagement > avgEngagement * 1.2)
    .map(([hour]) => `${hour}:00-${parseInt(hour) + 1}:00`);
    
  const lowEngagementPeriods = Object.entries(hourlyEngagement)
    .filter(([, engagement]) => engagement < avgEngagement * 0.5)
    .map(([hour]) => `${hour}:00-${parseInt(hour) + 1}:00`);
  
  const averageResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
    : 0;
  
  return {
    high_engagement_periods: highEngagementPeriods,
    low_engagement_periods: lowEngagementPeriods,
    average_response_time: Math.round(averageResponseTime),
  };
}

function categorizeReadingTime(hour: number): string[] {
  const categories = [];
  
  if (hour >= 6 && hour <= 8) categories.push('early_morning');
  if (hour >= 9 && hour <= 17) categories.push('business_hours');
  if (hour >= 18 && hour <= 22) categories.push('evening');
  if (hour >= 23 || hour <= 5) categories.push('late_night');
  if (hour >= 12 && hour <= 14) categories.push('lunch_time');
  
  return categories.length > 0 ? categories : ['business_hours'];
}

function calculateSentimentFactor(reactions: any[]): number {
  // Simple sentiment analysis based on common emoji patterns
  const positiveEmojis = ['👍', '❤️', '😊', '🎉', '✅', '👏', '🔥', '💯'];
  const negativeEmojis = ['👎', '😞', '😢', '❌', '😡', '💔'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  reactions.forEach(r => {
    if (positiveEmojis.includes(r.name)) positiveCount += r.count || 0;
    if (negativeEmojis.includes(r.name)) negativeCount += r.count || 0;
  });
  
  const totalSentimentReactions = positiveCount + negativeCount;
  if (totalSentimentReactions === 0) return 1; // Neutral
  
  const sentimentRatio = positiveCount / totalSentimentReactions;
  return 0.5 + (sentimentRatio * 0.5); // Scale from 0.5 to 1.0
}

/**
 * Generate AI-powered recommendations for marking conversations as read
 */
export function generateMarkRecommendations(analytics: any, channelId: string): string[] {
  const recommendations: string[] = [];
  
  try {
    // Analyze read activity
    if (analytics.read_activity) {
      if (analytics.read_activity.engagement_risk === 'high') {
        recommendations.push('🚨 High engagement risk detected - review important unread messages immediately');
      }
      
      if (analytics.read_activity.catch_up_score < 40) {
        recommendations.push('📱 Consider setting up notifications for this channel to stay more current');
      }
      
      if (analytics.read_activity.efficiency_score < 50) {
        recommendations.push('⚡ Low read efficiency - consider batch reading or using thread summaries');
      }
    }
    
    // Analyze channel intelligence
    if (analytics.channel_intelligence) {
      const unread = analytics.channel_intelligence.unread_analysis;
      if (unread?.priority_messages > 3) {
        recommendations.push(`⭐ ${unread.priority_messages} priority messages need attention - review highly engaged content first`);
      }
      
      if (unread?.estimated_read_time > 15) {
        recommendations.push(`⏱️ Estimated ${unread.estimated_read_time} minutes to catch up - consider scheduling focused reading time`);
      }
      
      const activity = analytics.channel_intelligence.activity_patterns;
      if (activity?.recent_activity?.activity_level === 'high') {
        recommendations.push('📈 High channel activity detected - consider increasing read frequency to stay engaged');
      }
    }
    
    // Add general recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push('✅ Channel is up to date - great job staying current!');
      recommendations.push('💡 Consider reviewing pinned messages for important updates');
    }
    
    return recommendations;
    
  } catch (error) {
    logger.error('Failed to generate mark recommendations', { error });
    return ['📖 Stay engaged with regular channel reading'];
  }
}
