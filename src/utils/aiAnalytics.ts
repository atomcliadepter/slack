/**
 * AI Analytics Module for Enhanced MCP Slack SDK
 * Provides intelligent analysis and insights for Slack data
 */

import { slackClient } from './slackClient';
import { logger } from './logger';

export interface ReadActivityAnalysis {
  read_count: number;
  unread_count: number;
  last_read_timestamp: string | null;
  reading_velocity: 'fast' | 'normal' | 'slow';
  catch_up_status: 'caught_up' | 'behind' | 'very_behind';
}

export interface SentimentAnalysis {
  score: number;
  confidence: number;
  emotions?: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
  };
}

export interface EngagementPrediction {
  score: number;
  factors: string[];
  recommendations: string[];
}

export interface ContentAnalysis {
  topics: string[];
  keyPhrases: string[];
  readabilityScore: number;
  tone: string;
  wordCount: number;
  characterCount: number;
}

export interface UserBehaviorAnalysis {
  activityPattern: string;
  preferredChannels: string[];
  communicationStyle: string;
  engagementLevel: number;
}

export interface TeamDynamicsAnalysis {
  collaborationScore: number;
  communicationFlow: {
    centralFigures: string[];
    isolatedMembers: string[];
  };
  teamHealth: number;
}

export interface ChannelNameAnalysis {
  appropriateness: number;
  suggestions: string[];
  sentiment: number;
}

export class AIAnalytics {
  private static cache = new Map<string, any>();

  static clearCache(): void {
    this.cache.clear();
  }

  static analyzeSentiment(text: string): SentimentAnalysis {
    const cacheKey = `sentiment:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Simple sentiment analysis based on keywords
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'love', 'happy', 'excited'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'frustrated', 'disappointed'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    const score = positiveCount > negativeCount ? 0.7 : negativeCount > positiveCount ? -0.7 : 0;
    const confidence = Math.min((positiveCount + negativeCount) / words.length * 2, 1);

    const result: SentimentAnalysis = {
      score,
      confidence,
      emotions: {
        joy: positiveCount > 0 ? 0.6 : 0.1,
        anger: negativeCount > 0 ? 0.5 : 0.1,
        fear: 0.1,
        sadness: negativeCount > 0 ? 0.3 : 0.1,
        surprise: 0.1
      }
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  static predictEngagement(content: string, context?: any): EngagementPrediction {
    const cacheKey = `engagement:${content}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const hasQuestion = content.includes('?');
    const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content);
    const isShort = content.length < 100;
    const isVeryLong = content.length > 500;

    let score = 0.5;
    const factors: string[] = [];
    const recommendations: string[] = [];

    if (hasQuestion) {
      score += 0.2;
      factors.push('Contains question');
    }
    if (hasEmoji) {
      score += 0.1;
      factors.push('Contains emoji');
    }
    if (isShort) {
      score += 0.1;
      factors.push('Concise length');
    }
    if (isVeryLong) {
      score -= 0.2;
      factors.push('Very long content');
      recommendations.push('Consider breaking into shorter messages');
    }

    const result: EngagementPrediction = {
      score: Math.min(Math.max(score, 0), 1),
      factors,
      recommendations
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  static analyzeContent(content: string): ContentAnalysis {
    const words = content.split(/\s+/);
    const wordCount = words.length;
    const characterCount = content.length;

    // Simple topic extraction
    const topics = words.filter(word => word.length > 5).slice(0, 3);
    const keyPhrases = content.match(/\b\w+\s+\w+\b/g)?.slice(0, 5) || [];

    // Simple readability score (inverse of average word length)
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;
    const readabilityScore = Math.max(0, 100 - avgWordLength * 10);

    // Simple tone detection
    const sentiment = this.analyzeSentiment(content);
    const tone = sentiment.score > 0.3 ? 'positive' : sentiment.score < -0.3 ? 'negative' : 'neutral';

    return {
      topics,
      keyPhrases,
      readabilityScore,
      tone,
      wordCount,
      characterCount
    };
  }

  static analyzeUserBehavior(messages: any[]): UserBehaviorAnalysis {
    const channelCounts = new Map<string, number>();
    let totalMessages = messages.length;

    messages.forEach(msg => {
      const channel = msg.channel || 'unknown';
      channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
    });

    const preferredChannels = Array.from(channelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([channel]) => channel);

    const avgMessageLength = messages.reduce((sum, msg) => sum + (msg.text?.length || 0), 0) / totalMessages;
    const communicationStyle = avgMessageLength > 100 ? 'verbose' : avgMessageLength < 20 ? 'concise' : 'balanced';

    return {
      activityPattern: totalMessages > 50 ? 'high' : totalMessages > 10 ? 'medium' : 'low',
      preferredChannels,
      communicationStyle,
      engagementLevel: Math.min(totalMessages / 100, 1)
    };
  }

  static analyzeTeamDynamics(messages: any[], members: string[]): TeamDynamicsAnalysis {
    const userMessageCounts = new Map<string, number>();
    
    messages.forEach(msg => {
      const user = msg.user || msg.username;
      if (user) {
        userMessageCounts.set(user, (userMessageCounts.get(user) || 0) + 1);
      }
    });

    const sortedUsers = Array.from(userMessageCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    const centralFigures = sortedUsers.slice(0, 3).map(([user]) => user);
    const isolatedMembers = members.filter(member => !userMessageCounts.has(member));

    const collaborationScore = Math.min((sortedUsers.length / members.length), 1);
    const teamHealth = collaborationScore * 100;

    return {
      collaborationScore,
      communicationFlow: {
        centralFigures,
        isolatedMembers
      },
      teamHealth
    };
  }

  static analyzeChannelName(name: string): ChannelNameAnalysis {
    const hasUpperCase = /[A-Z]/.test(name);
    const hasSpaces = /\s/.test(name);
    const hasSpecialChars = /[^a-zA-Z0-9-_]/.test(name);
    const isVeryLong = name.length > 21;
    const endsWithHyphen = name.endsWith('-');

    let appropriateness = 1.0;
    const suggestions: string[] = [];

    if (hasUpperCase) {
      appropriateness -= 0.3;
      suggestions.push('Use lowercase letters only');
    }
    if (hasSpaces) {
      appropriateness -= 0.3;
      suggestions.push('Replace spaces with hyphens');
    }
    if (hasSpecialChars) {
      appropriateness -= 0.2;
      suggestions.push('Remove special characters');
    }
    if (isVeryLong) {
      appropriateness -= 0.2;
      suggestions.push('Consider shortening the name');
    }
    if (endsWithHyphen) {
      appropriateness -= 0.1;
      suggestions.push('Remove trailing hyphens');
    }

    const sentiment = this.analyzeSentiment(name).score;

    return {
      appropriateness: Math.max(appropriateness, 0),
      suggestions,
      sentiment
    };
  }
}
