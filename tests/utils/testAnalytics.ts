/**
 * Test analytics utilities for testing AI-powered features
 */

export interface ThreadAnalysis {
  thread_length: number;
  participant_count: number;
  average_response_time?: number;
  sentiment_trend?: string;
}

export interface EmojiSentiment {
  emoji: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface ProfileCompleteness {
  score: number;
  missing_fields: string[];
  completeness_percentage: number;
}

export interface SentimentAnalysis {
  overall_sentiment: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
}

export interface ActivityIndicators {
  activity_level: 'high' | 'medium' | 'low';
  last_active: string;
  engagement_score: number;
}

export interface QueryAnalysis {
  complexity: 'simple' | 'medium' | 'complex';
  keywords: string[];
  intent: string;
}

export interface UserRecommendations {
  profile_improvements: string[];
  security_suggestions: string[];
  engagement_tips: string[];
}

/**
 * Analyze thread messages for testing
 */
export function analyzeThread(messages: any[]): ThreadAnalysis {
  const uniqueUsers = new Set(messages.map(m => m.user));
  
  return {
    thread_length: messages.length,
    participant_count: uniqueUsers.size,
    sentiment_trend: 'positive',
  };
}

/**
 * Get emoji sentiment for testing
 */
export function getEmojiSentiment(emoji: string): EmojiSentiment {
  const positiveEmojis = ['thumbsup', 'heart', 'smile', 'tada', 'clap'];
  const negativeEmojis = ['thumbsdown', 'disappointed', 'angry', 'cry'];
  
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  let score = 0;
  
  if (positiveEmojis.includes(emoji)) {
    sentiment = 'positive';
    score = 0.8;
  } else if (negativeEmojis.includes(emoji)) {
    sentiment = 'negative';
    score = -0.8;
  }
  
  return { emoji, sentiment, score };
}

/**
 * Categorize emoji for testing
 */
export function categorizeEmoji(emoji: string): string {
  const categories: Record<string, string[]> = {
    'reaction': ['thumbsup', 'thumbsdown', 'heart', 'clap'],
    'emotion': ['smile', 'cry', 'angry', 'disappointed'],
    'celebration': ['tada', 'party', 'confetti'],
    'object': ['computer', 'phone', 'book'],
  };
  
  for (const [category, emojis] of Object.entries(categories)) {
    if (emojis.includes(emoji)) {
      return category;
    }
  }
  
  return 'other';
}

/**
 * Assess profile completeness for testing
 */
export function assessProfileCompleteness(profile: any): ProfileCompleteness {
  const requiredFields = ['real_name', 'email', 'title', 'phone'];
  const missingFields = requiredFields.filter(field => !profile[field]);
  const score = ((requiredFields.length - missingFields.length) / requiredFields.length) * 100;
  
  return {
    score: Math.round(score),
    missing_fields: missingFields,
    completeness_percentage: score,
  };
}

/**
 * Analyze sentiment for testing
 */
export function analyzeSentiment(reactions: any[]): SentimentAnalysis {
  const positive = reactions.filter(r => ['thumbsup', 'heart', 'smile'].includes(r.name)).length;
  const negative = reactions.filter(r => ['thumbsdown', 'angry', 'cry'].includes(r.name)).length;
  const neutral = reactions.length - positive - negative;
  
  return {
    overall_sentiment: positive - negative,
    positive_count: positive,
    negative_count: negative,
    neutral_count: neutral,
  };
}

/**
 * Analyze activity indicators for testing
 */
export function analyzeActivityIndicators(user: any): ActivityIndicators {
  return {
    activity_level: 'medium',
    last_active: new Date().toISOString(),
    engagement_score: 75,
  };
}

/**
 * Analyze query for testing
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const words = query.toLowerCase().split(' ');
  return {
    complexity: words.length > 5 ? 'complex' : words.length > 2 ? 'medium' : 'simple',
    keywords: words.filter(w => w.length > 3),
    intent: 'search',
  };
}

/**
 * Generate user recommendations for testing
 */
export function generateUserRecommendations(analytics: any, user: any): UserRecommendations {
  return {
    profile_improvements: ['Add profile photo', 'Update job title'],
    security_suggestions: ['Enable 2FA', 'Update password'],
    engagement_tips: ['Join more channels', 'Participate in discussions'],
  };
}

/**
 * Generate mock Slack user for testing
 */
export function createMockSlackUser(overrides: any = {}) {
  return {
    id: 'U1234567890',
    name: 'testuser',
    real_name: 'Test User',
    profile: {
      email: 'test@example.com',
      title: 'Software Engineer',
      phone: '+1234567890',
      image_24: 'https://example.com/avatar.jpg',
    },
    is_admin: false,
    is_owner: false,
    is_bot: false,
    deleted: false,
    ...overrides,
  };
}

/**
 * Generate mock Slack channel for testing
 */
export function createMockSlackChannel(overrides: any = {}) {
  return {
    id: 'C1234567890',
    name: 'test-channel',
    is_channel: true,
    is_group: false,
    is_im: false,
    is_private: false,
    is_archived: false,
    is_general: false,
    creator: 'U1234567890',
    created: 1234567890,
    num_members: 10,
    topic: {
      value: 'Test channel topic',
      creator: 'U1234567890',
      last_set: 1234567890,
    },
    purpose: {
      value: 'Test channel purpose',
      creator: 'U1234567890',
      last_set: 1234567890,
    },
    ...overrides,
  };
}

/**
 * Generate mock Slack message for testing
 */
export function createMockSlackMessage(overrides: any = {}) {
  return {
    type: 'message',
    user: 'U1234567890',
    text: 'Test message',
    ts: '1234567890.123456',
    channel: 'C1234567890',
    ...overrides,
  };
}
