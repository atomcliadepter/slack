/**
 * Advanced Analytics Module for Enhanced MCP Slack SDK
 * Provides sophisticated user, content, and interaction analysis
 */

import { slackClient } from './slackClient';
import { logger } from './logger';

export interface UserAnalysis {
  profile_completeness: {
    score: number;
    missing_fields: string[];
    completion_percentage: number;
  };
  activity_indicators: {
    last_activity: string;
    activity_level: 'high' | 'medium' | 'low';
    engagement_score: number;
  };
  communication_style: {
    style: 'formal' | 'casual' | 'collaborative' | 'direct';
    formality_score: number;
    responsiveness: 'excellent' | 'good' | 'moderate' | 'poor';
  };
  expertise_areas: string[];
  influence_score: number;
}

export interface ContentAnalysis {
  sentiment_analysis: {
    overall_sentiment: 'positive' | 'negative' | 'neutral';
    sentiment_score: number;
    emotional_indicators: string[];
  };
  topic_extraction: {
    primary_topics: string[];
    topic_confidence: Record<string, number>;
    trending_topics: string[];
  };
  engagement_prediction: {
    predicted_engagement: number;
    engagement_factors: string[];
    optimal_timing: string;
  };
}

export interface ThreadAnalysis {
  conversation_flow: {
    flow_quality: 'excellent' | 'good' | 'moderate' | 'poor';
    response_rate: number;
    average_response_time: number;
  };
  participant_analysis: {
    total_participants: number;
    active_participants: number;
    participation_distribution: Record<string, number>;
  };
  resolution_indicators: {
    is_resolved: boolean;
    resolution_confidence: number;
    resolution_indicators: string[];
  };
}

/**
 * Analyzes user profile completeness and provides recommendations
 */
export async function assessProfileCompleteness(user: any): Promise<UserAnalysis['profile_completeness']> {
  try {
    const profile = user.profile || {};
    const requiredFields = ['real_name', 'display_name', 'title', 'phone', 'email'];
    const optionalFields = ['status_text', 'image_512', 'first_name', 'last_name'];
    
    const missingRequired = requiredFields.filter(field => !profile[field]);
    const missingOptional = optionalFields.filter(field => !profile[field]);
    
    const totalFields = requiredFields.length + optionalFields.length;
    const completedFields = totalFields - missingRequired.length - missingOptional.length;
    const completionPercentage = (completedFields / totalFields) * 100;
    
    // Calculate weighted score (required fields worth more)
    const requiredScore = ((requiredFields.length - missingRequired.length) / requiredFields.length) * 70;
    const optionalScore = ((optionalFields.length - missingOptional.length) / optionalFields.length) * 30;
    const score = requiredScore + optionalScore;
    
    const missingFields = [...missingRequired, ...missingOptional];
    
    return {
      score: Math.round(score),
      missing_fields: missingFields,
      completion_percentage: Math.round(completionPercentage),
    };
    
  } catch (error) {
    logger.error('Failed to assess profile completeness', { error });
    return {
      score: 0,
      missing_fields: [],
      completion_percentage: 0,
    };
  }
}

/**
 * Analyzes user activity indicators and engagement patterns
 */
export function analyzeActivityIndicators(user: any): UserAnalysis['activity_indicators'] {
  try {
    const now = Date.now() / 1000;
    const lastActivity = user.updated || user.profile?.status_expiration || now;
    const timeSinceActivity = now - lastActivity;
    
    // Determine activity level based on various factors
    let activityLevel: 'high' | 'medium' | 'low' = 'low';
    let engagementScore = 0;
    
    // Recent activity (within last 24 hours)
    if (timeSinceActivity < 86400) {
      activityLevel = 'high';
      engagementScore += 40;
    } else if (timeSinceActivity < 604800) { // Within last week
      activityLevel = 'medium';
      engagementScore += 20;
    }
    
    // Profile indicators
    if (user.profile?.status_text) engagementScore += 10;
    if (user.profile?.status_emoji) engagementScore += 5;
    if (user.is_admin || user.is_owner) engagementScore += 15;
    if (!user.deleted && !user.is_bot) engagementScore += 10;
    
    // Presence indicators
    if (user.presence === 'active') engagementScore += 20;
    
    return {
      last_activity: new Date(lastActivity * 1000).toISOString(),
      activity_level: activityLevel,
      engagement_score: Math.min(100, engagementScore),
    };
    
  } catch (error) {
    logger.error('Failed to analyze activity indicators', { error });
    return {
      last_activity: new Date().toISOString(),
      activity_level: 'low',
      engagement_score: 0,
    };
  }
}

/**
 * Infers communication style from user data and interactions
 */
export function inferCommunicationStyle(user: any): UserAnalysis['communication_style'] {
  try {
    const profile = user.profile || {};
    let formalityScore = 50; // Start neutral
    let style: 'formal' | 'casual' | 'collaborative' | 'direct' = 'collaborative';
    let responsiveness: 'excellent' | 'good' | 'moderate' | 'poor' = 'moderate';
    
    // Analyze profile for formality indicators
    if (profile.title && profile.title.includes('Director|Manager|VP|CEO|CTO')) {
      formalityScore += 20;
      style = 'formal';
    }
    
    if (profile.status_emoji && profile.status_emoji.includes('🎉|😄|🚀')) {
      formalityScore -= 10;
      style = 'casual';
    }
    
    // Admin/owner users tend to be more collaborative
    if (user.is_admin || user.is_owner) {
      style = 'collaborative';
      responsiveness = 'good';
    }
    
    // Recent activity suggests good responsiveness
    const now = Date.now() / 1000;
    const lastActivity = user.updated || now;
    if (now - lastActivity < 3600) { // Active within last hour
      responsiveness = 'excellent';
    } else if (now - lastActivity < 86400) { // Active within last day
      responsiveness = 'good';
    }
    
    return {
      style,
      formality_score: Math.max(0, Math.min(100, formalityScore)),
      responsiveness,
    };
    
  } catch (error) {
    logger.error('Failed to infer communication style', { error });
    return {
      style: 'collaborative',
      formality_score: 50,
      responsiveness: 'moderate',
    };
  }
}

/**
 * Identifies potential expertise areas based on user profile and role
 */
export function identifyExpertiseAreas(user: any): string[] {
  try {
    const expertiseAreas: string[] = [];
    const profile = user.profile || {};
    const title = (profile.title || '').toLowerCase();
    
    // Technical expertise
    if (title.includes('engineer|developer|architect|tech')) {
      expertiseAreas.push('Software Development', 'Technical Architecture');
    }
    if (title.includes('data|analytics|scientist')) {
      expertiseAreas.push('Data Analysis', 'Analytics');
    }
    if (title.includes('devops|infrastructure|cloud')) {
      expertiseAreas.push('DevOps', 'Cloud Infrastructure');
    }
    if (title.includes('security|cyber')) {
      expertiseAreas.push('Cybersecurity', 'Information Security');
    }
    
    // Business expertise
    if (title.includes('manager|director|lead')) {
      expertiseAreas.push('Team Management', 'Leadership');
    }
    if (title.includes('product|pm')) {
      expertiseAreas.push('Product Management', 'Strategy');
    }
    if (title.includes('marketing|growth')) {
      expertiseAreas.push('Marketing', 'Growth Strategy');
    }
    if (title.includes('sales|business development')) {
      expertiseAreas.push('Sales', 'Business Development');
    }
    
    // Design expertise
    if (title.includes('design|ux|ui')) {
      expertiseAreas.push('User Experience', 'Design');
    }
    
    // Administrative roles
    if (user.is_admin || user.is_owner) {
      expertiseAreas.push('Administration', 'Workspace Management');
    }
    
    return expertiseAreas.length > 0 ? expertiseAreas : ['General Collaboration'];
    
  } catch (error) {
    logger.error('Failed to identify expertise areas', { error });
    return ['General Collaboration'];
  }
}

/**
 * Calculates user influence score based on various factors
 */
export function calculateInfluenceScore(user: any): number {
  try {
    let influenceScore = 0;
    
    // Administrative privileges
    if (user.is_owner) influenceScore += 40;
    else if (user.is_admin) influenceScore += 30;
    else if (user.is_primary_owner) influenceScore += 35;
    
    // Profile completeness indicates engagement
    const profile = user.profile || {};
    if (profile.title) influenceScore += 10;
    if (profile.real_name) influenceScore += 5;
    if (profile.image_512) influenceScore += 5;
    if (profile.status_text) influenceScore += 5;
    
    // Activity indicators
    const now = Date.now() / 1000;
    const lastActivity = user.updated || now;
    const timeSinceActivity = now - lastActivity;
    
    if (timeSinceActivity < 86400) influenceScore += 15; // Active today
    else if (timeSinceActivity < 604800) influenceScore += 10; // Active this week
    else if (timeSinceActivity < 2592000) influenceScore += 5; // Active this month
    
    // Account status
    if (!user.deleted && !user.is_restricted) influenceScore += 10;
    if (user.is_bot) influenceScore -= 20; // Bots have different influence
    
    return Math.max(0, Math.min(100, influenceScore));
    
  } catch (error) {
    logger.error('Failed to calculate influence score', { error });
    return 0;
  }
}

/**
 * Analyzes content sentiment and emotional indicators
 */
export function analyzeContentSentiment(text: string): ContentAnalysis['sentiment_analysis'] {
  try {
    if (!text || text.trim().length === 0) {
      return {
        overall_sentiment: 'neutral',
        sentiment_score: 50,
        emotional_indicators: [],
      };
    }
    
    const lowerText = text.toLowerCase();
    
    // Positive indicators
    const positiveWords = [
      'great', 'excellent', 'awesome', 'fantastic', 'wonderful', 'amazing',
      'love', 'like', 'enjoy', 'happy', 'excited', 'thrilled',
      'success', 'achievement', 'congratulations', 'celebrate',
      'thank', 'appreciate', 'grateful', 'perfect', 'brilliant'
    ];
    
    // Negative indicators
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike',
      'angry', 'frustrated', 'disappointed', 'sad', 'upset',
      'problem', 'issue', 'error', 'bug', 'broken', 'failed',
      'wrong', 'difficult', 'hard', 'struggle', 'concern'
    ];
    
    // Neutral/professional indicators
    const neutralWords = [
      'update', 'information', 'report', 'status', 'meeting',
      'discuss', 'review', 'consider', 'analyze', 'evaluate'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    const words = lowerText.match(/\b\w+\b/g) || [];
    const emotionalIndicators: string[] = [];
    
    words.forEach(word => {
      if (positiveWords.includes(word)) {
        positiveCount++;
        emotionalIndicators.push(`positive: ${word}`);
      } else if (negativeWords.includes(word)) {
        negativeCount++;
        emotionalIndicators.push(`negative: ${word}`);
      } else if (neutralWords.includes(word)) {
        neutralCount++;
      }
    });
    
    // Calculate sentiment score (0-100, where 50 is neutral)
    const totalEmotionalWords = positiveCount + negativeCount;
    let sentimentScore = 50; // Start neutral
    
    if (totalEmotionalWords > 0) {
      const positiveRatio = positiveCount / totalEmotionalWords;
      sentimentScore = 50 + (positiveRatio - 0.5) * 100;
    }
    
    // Determine overall sentiment
    let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (sentimentScore > 60) overallSentiment = 'positive';
    else if (sentimentScore < 40) overallSentiment = 'negative';
    
    // Check for emoji sentiment
    const positiveEmojis = ['😊', '😄', '🎉', '👍', '❤️', '🔥', '✅', '💯'];
    const negativeEmojis = ['😞', '😢', '👎', '❌', '😡', '💔'];
    
    positiveEmojis.forEach(emoji => {
      if (text.includes(emoji)) {
        sentimentScore += 5;
        emotionalIndicators.push(`positive emoji: ${emoji}`);
      }
    });
    
    negativeEmojis.forEach(emoji => {
      if (text.includes(emoji)) {
        sentimentScore -= 5;
        emotionalIndicators.push(`negative emoji: ${emoji}`);
      }
    });
    
    // Recalculate overall sentiment after emoji adjustment
    if (sentimentScore > 60) overallSentiment = 'positive';
    else if (sentimentScore < 40) overallSentiment = 'negative';
    else overallSentiment = 'neutral';
    
    return {
      overall_sentiment: overallSentiment,
      sentiment_score: Math.max(0, Math.min(100, Math.round(sentimentScore))),
      emotional_indicators: emotionalIndicators.slice(0, 10), // Limit to top 10
    };
    
  } catch (error) {
    logger.error('Failed to analyze content sentiment', { error });
    return {
      overall_sentiment: 'neutral',
      sentiment_score: 50,
      emotional_indicators: [],
    };
  }
}

/**
 * Extracts topics from content using keyword analysis
 */
export function extractTopics(text: string): ContentAnalysis['topic_extraction'] {
  try {
    if (!text || text.trim().length === 0) {
      return {
        primary_topics: [],
        topic_confidence: {},
        trending_topics: [],
      };
    }
    
    const lowerText = text.toLowerCase();
    
    // Define topic categories and their keywords
    const topicKeywords = {
      'Technology': ['tech', 'software', 'code', 'development', 'programming', 'api', 'database', 'server', 'cloud', 'ai', 'ml'],
      'Project Management': ['project', 'task', 'deadline', 'milestone', 'sprint', 'agile', 'scrum', 'planning', 'timeline'],
      'Business': ['business', 'revenue', 'sales', 'marketing', 'customer', 'client', 'strategy', 'growth', 'market'],
      'Design': ['design', 'ui', 'ux', 'interface', 'user', 'experience', 'visual', 'prototype', 'wireframe'],
      'Operations': ['ops', 'deployment', 'infrastructure', 'monitoring', 'performance', 'scaling', 'maintenance'],
      'Communication': ['meeting', 'discussion', 'feedback', 'review', 'update', 'announcement', 'question'],
      'Support': ['help', 'support', 'issue', 'problem', 'bug', 'fix', 'troubleshoot', 'resolve'],
      'Training': ['training', 'learning', 'education', 'tutorial', 'documentation', 'guide', 'workshop'],
    };
    
    const topicScores: Record<string, number> = {};
    const words = lowerText.match(/\b\w{3,}\b/g) || [];
    
    // Calculate topic scores
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        score += matches;
      });
      if (score > 0) {
        topicScores[topic] = score;
      }
    });
    
    // Sort topics by score
    const sortedTopics = Object.entries(topicScores)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);
    
    const primaryTopics = sortedTopics.map(([topic]) => topic);
    
    // Calculate confidence scores (normalized to 0-100)
    const maxScore = Math.max(...Object.values(topicScores));
    const topicConfidence: Record<string, number> = {};
    Object.entries(topicScores).forEach(([topic, score]) => {
      topicConfidence[topic] = Math.round((score / Math.max(1, maxScore)) * 100);
    });
    
    // Trending topics are those with high confidence
    const trendingTopics = sortedTopics
      .filter(([, score]) => score >= maxScore * 0.7)
      .map(([topic]) => topic);
    
    return {
      primary_topics: primaryTopics,
      topic_confidence: topicConfidence,
      trending_topics: trendingTopics,
    };
    
  } catch (error) {
    logger.error('Failed to extract topics', { error });
    return {
      primary_topics: [],
      topic_confidence: {},
      trending_topics: [],
    };
  }
}

/**
 * Analyzes thread conversation flow and quality
 */
export function analyzeConversationFlow(messages: any[]): ThreadAnalysis['conversation_flow'] {
  try {
    if (!messages || messages.length === 0) {
      return {
        flow_quality: 'poor',
        response_rate: 0,
        average_response_time: 0,
      };
    }
    
    const sortedMessages = messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
    const responseTimes: number[] = [];
    let totalResponses = 0;
    
    // Calculate response times between consecutive messages
    for (let i = 1; i < sortedMessages.length; i++) {
      const currentTime = parseFloat(sortedMessages[i].ts);
      const previousTime = parseFloat(sortedMessages[i - 1].ts);
      const responseTime = currentTime - previousTime;
      
      // Only count as response if within reasonable time (< 24 hours)
      if (responseTime < 86400) {
        responseTimes.push(responseTime);
        totalResponses++;
      }
    }
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    const responseRate = messages.length > 1 ? (totalResponses / (messages.length - 1)) * 100 : 0;
    
    // Determine flow quality based on response rate and timing
    let flowQuality: 'excellent' | 'good' | 'moderate' | 'poor' = 'poor';
    
    if (responseRate > 80 && averageResponseTime < 3600) { // > 80% response rate, < 1 hour avg
      flowQuality = 'excellent';
    } else if (responseRate > 60 && averageResponseTime < 7200) { // > 60% response rate, < 2 hours avg
      flowQuality = 'good';
    } else if (responseRate > 40 && averageResponseTime < 14400) { // > 40% response rate, < 4 hours avg
      flowQuality = 'moderate';
    }
    
    return {
      flow_quality: flowQuality,
      response_rate: Math.round(responseRate * 100) / 100,
      average_response_time: Math.round(averageResponseTime),
    };
    
  } catch (error) {
    logger.error('Failed to analyze conversation flow', { error });
    return {
      flow_quality: 'poor',
      response_rate: 0,
      average_response_time: 0,
    };
  }
}

/**
 * Analyzes thread participants and their engagement
 */
export function analyzeThreadParticipants(messages: any[]): ThreadAnalysis['participant_analysis'] {
  try {
    if (!messages || messages.length === 0) {
      return {
        total_participants: 0,
        active_participants: 0,
        participation_distribution: {},
      };
    }
    
    const participationCounts: Record<string, number> = {};
    const uniqueParticipants = new Set<string>();
    
    messages.forEach(message => {
      if (message.user) {
        uniqueParticipants.add(message.user);
        participationCounts[message.user] = (participationCounts[message.user] || 0) + 1;
      }
    });
    
    const totalParticipants = uniqueParticipants.size;
    
    // Consider participants "active" if they contributed more than 1 message
    // or if there are few participants, then all are considered active
    const activeThreshold = totalParticipants > 5 ? 2 : 1;
    const activeParticipants = Object.values(participationCounts)
      .filter(count => count >= activeThreshold).length;
    
    // Calculate participation percentages
    const participationDistribution: Record<string, number> = {};
    Object.entries(participationCounts).forEach(([user, count]) => {
      participationDistribution[user] = Math.round((count / messages.length) * 100);
    });
    
    return {
      total_participants: totalParticipants,
      active_participants: activeParticipants,
      participation_distribution: participationDistribution,
    };
    
  } catch (error) {
    logger.error('Failed to analyze thread participants', { error });
    return {
      total_participants: 0,
      active_participants: 0,
      participation_distribution: {},
    };
  }
}

/**
 * Analyzes thread for resolution indicators
 */
export function analyzeResolutionIndicators(messages: any[]): ThreadAnalysis['resolution_indicators'] {
  try {
    if (!messages || messages.length === 0) {
      return {
        is_resolved: false,
        resolution_confidence: 0,
        resolution_indicators: [],
      };
    }
    
    const allText = messages.map(m => (m.text || '').toLowerCase()).join(' ');
    const resolutionIndicators: string[] = [];
    let resolutionScore = 0;
    
    // Positive resolution keywords
    const resolvedKeywords = [
      'solved', 'resolved', 'fixed', 'done', 'completed', 'finished',
      'working', 'success', 'thank', 'thanks', 'perfect', 'great'
    ];
    
    // Question/problem keywords (negative for resolution)
    const problemKeywords = [
      'problem', 'issue', 'error', 'bug', 'help', 'question',
      'stuck', 'broken', 'fail', 'wrong', 'not working'
    ];
    
    resolvedKeywords.forEach(keyword => {
      const matches = (allText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
      if (matches > 0) {
        resolutionScore += matches * 10;
        resolutionIndicators.push(`Resolution keyword: ${keyword} (${matches}x)`);
      }
    });
    
    problemKeywords.forEach(keyword => {
      const matches = (allText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
      if (matches > 0) {
        resolutionScore -= matches * 5;
        resolutionIndicators.push(`Problem keyword: ${keyword} (${matches}x)`);
      }
    });
    
    // Check for positive reactions on recent messages
    const recentMessages = messages.slice(-3); // Last 3 messages
    const positiveReactions = recentMessages.reduce((sum, m) => {
      const reactions = m.reactions || [];
      return sum + reactions.filter((r: any) => 
        ['👍', '✅', '🎉', '❤️', '👏'].includes(r.name)
      ).reduce((rSum: number, r: any) => rSum + (r.count || 0), 0);
    }, 0);
    
    if (positiveReactions > 0) {
      resolutionScore += positiveReactions * 15;
      resolutionIndicators.push(`Positive reactions: ${positiveReactions}`);
    }
    
    // Check if conversation has died down (no recent activity)
    const lastMessage = messages[messages.length - 1];
    const timeSinceLastMessage = (Date.now() / 1000) - parseFloat(lastMessage.ts);
    
    if (timeSinceLastMessage > 86400 && resolutionScore > 0) { // > 1 day and some positive indicators
      resolutionScore += 20;
      resolutionIndicators.push('Conversation concluded naturally');
    }
    
    const resolutionConfidence = Math.max(0, Math.min(100, resolutionScore));
    const isResolved = resolutionConfidence > 60;
    
    return {
      is_resolved: isResolved,
      resolution_confidence: resolutionConfidence,
      resolution_indicators: resolutionIndicators,
    };
    
  } catch (error) {
    logger.error('Failed to analyze resolution indicators', { error });
    return {
      is_resolved: false,
      resolution_confidence: 0,
      resolution_indicators: [],
    };
  }
}

// Export types only once at the end
export type {
  // Remove duplicate exports - these are already exported above
  // UserAnalysis,
  // ContentAnalysis,
  // ThreadAnalysis,
};
