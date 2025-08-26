
// Simple console logger for AI analytics
const logger = {
  createLogger: (name: string) => ({
    info: (message: string, data?: any) => {
      console.log(`[${name}] INFO: ${message}`, data ? JSON.stringify(data) : '');
    }
  })
};

export interface SentimentAnalysis {
  score: number; // -1 to 1
  magnitude: number; // 0 to 1
  label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
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
  score: number; // 0 to 1
  factors: string[];
  recommendation: string;
  optimalTiming?: {
    hour: number;
    dayOfWeek: number;
  };
}

export interface ContentAnalysis {
  topics: string[];
  readability: number; // 0 to 1
  sentiment: string;
  keyPhrases: string[];
  wordCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
  tone: 'formal' | 'informal' | 'neutral';
}

export interface UserBehaviorPattern {
  userId: string;
  activityPattern: {
    peakHours: number[];
    preferredChannels: string[];
    responseTime: number;
    engagementRate: number;
  };
  communicationStyle: {
    averageMessageLength: number;
    emojiUsage: number;
    formalityScore: number;
  };
  collaborationMetrics: {
    threadsStarted: number;
    threadsParticipated: number;
    mentionsGiven: number;
    mentionsReceived: number;
  };
}

export interface TeamDynamics {
  teamId: string;
  collaborationScore: number;
  communicationFlow: {
    centralFigures: string[];
    isolatedMembers: string[];
    subGroups: string[][];
  };
  healthMetrics: {
    responseRate: number;
    participationBalance: number;
    conflictIndicators: number;
  };
}

class AIAnalyticsClass {
  private readonly logger = logger.createLogger('AIAnalytics');
  private sentimentCache = new Map<string, SentimentAnalysis>();
  private engagementCache = new Map<string, EngagementPrediction>();

  // Sentiment Analysis
  analyzeSentiment(text: string): SentimentAnalysis {
    const cacheKey = this.hashText(text);
    
    if (this.sentimentCache.has(cacheKey)) {
      return this.sentimentCache.get(cacheKey)!;
    }

    const analysis = this.performSentimentAnalysis(text);
    this.sentimentCache.set(cacheKey, analysis);
    
    return analysis;
  }

  private performSentimentAnalysis(text: string): SentimentAnalysis {
    // Simplified sentiment analysis - in production, use ML models
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'excited'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed', 'worried'];
    const emotionWords = {
      joy: ['happy', 'excited', 'thrilled', 'delighted', 'cheerful'],
      anger: ['angry', 'furious', 'mad', 'irritated', 'annoyed'],
      fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous'],
      sadness: ['sad', 'depressed', 'disappointed', 'upset', 'down'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned']
    };

    const words = text.toLowerCase().split(/\W+/);
    const totalWords = words.length;

    let positiveCount = 0;
    let negativeCount = 0;
    const emotions = { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0 };

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
      
      Object.entries(emotionWords).forEach(([emotion, emotionWordList]) => {
        if (emotionWordList.includes(word)) {
          emotions[emotion as keyof typeof emotions]++;
        }
      });
    });

    const score = totalWords > 0 ? (positiveCount - negativeCount) / totalWords : 0;
    const magnitude = totalWords > 0 ? (positiveCount + negativeCount) / totalWords : 0;
    
    let label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    if (score > 0.1) label = 'POSITIVE';
    else if (score < -0.1) label = 'NEGATIVE';
    else label = 'NEUTRAL';

    const confidence = Math.min(magnitude * 2, 1);

    // Normalize emotions
    const totalEmotions = Object.values(emotions).reduce((sum, count) => sum + count, 0);
    if (totalEmotions > 0) {
      Object.keys(emotions).forEach(emotion => {
        emotions[emotion as keyof typeof emotions] /= totalEmotions;
      });
    }

    return {
      score: Math.max(-1, Math.min(1, score * 5)), // Scale and clamp
      magnitude,
      label,
      confidence,
      emotions
    };
  }

  // Engagement Prediction
  predictEngagement(content: string, context?: {
    channel?: string;
    timeOfDay?: number;
    dayOfWeek?: number;
    authorHistory?: any;
  }): EngagementPrediction {
    const cacheKey = this.hashText(content + JSON.stringify(context || {}));
    
    if (this.engagementCache.has(cacheKey)) {
      return this.engagementCache.get(cacheKey)!;
    }

    const prediction = this.performEngagementPrediction(content, context);
    this.engagementCache.set(cacheKey, prediction);
    
    return prediction;
  }

  private performEngagementPrediction(content: string, context?: any): EngagementPrediction {
    let score = 0.5; // Base score
    const factors: string[] = [];

    // Content analysis factors
    const sentiment = this.analyzeSentiment(content);
    if (sentiment.label === 'POSITIVE') {
      score += 0.1;
      factors.push('positive_sentiment');
    }

    // Length factor
    const wordCount = content.split(/\W+/).length;
    if (wordCount >= 10 && wordCount <= 50) {
      score += 0.1;
      factors.push('optimal_length');
    } else if (wordCount > 100) {
      score -= 0.1;
      factors.push('too_long');
    }

    // Question factor
    if (content.includes('?')) {
      score += 0.15;
      factors.push('contains_question');
    }

    // Emoji factor
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    if (emojiCount > 0 && emojiCount <= 3) {
      score += 0.05;
      factors.push('appropriate_emoji_usage');
    }

    // Time-based factors
    if (context?.timeOfDay) {
      // Peak engagement hours (9-11 AM, 2-4 PM)
      if ((context.timeOfDay >= 9 && context.timeOfDay <= 11) || 
          (context.timeOfDay >= 14 && context.timeOfDay <= 16)) {
        score += 0.1;
        factors.push('peak_hours');
      }
    }

    // Day of week factor
    if (context?.dayOfWeek && context.dayOfWeek >= 1 && context.dayOfWeek <= 5) {
      score += 0.05;
      factors.push('weekday_posting');
    }

    // Clamp score
    score = Math.max(0, Math.min(1, score));

    // Generate recommendation
    let recommendation = 'Standard engagement expected';
    if (score > 0.7) {
      recommendation = 'High engagement likely - great content!';
    } else if (score < 0.3) {
      recommendation = 'Consider revising content for better engagement';
    }

    return {
      score,
      factors,
      recommendation,
      optimalTiming: this.getOptimalTiming(context)
    };
  }

  private getOptimalTiming(_context?: any): { hour: number; dayOfWeek: number } | undefined {
    // Return optimal posting time based on historical data
    // This would typically be based on actual analytics
    return {
      hour: 10, // 10 AM
      dayOfWeek: 2 // Tuesday
    };
  }

  // Content Analysis
  analyzeContent(text: string): ContentAnalysis {
    const words = text.split(/\W+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Topic extraction (simplified)
    const topics = this.extractTopics(text);
    
    // Readability calculation (simplified Flesch Reading Ease)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    const avgSyllablesPerWord = this.calculateAvgSyllables(words);
    
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    const readability = Math.max(0, Math.min(1, fleschScore / 100));

    // Key phrases extraction
    const keyPhrases = this.extractKeyPhrases(text);

    // Complexity assessment
    let complexity: 'simple' | 'moderate' | 'complex';
    if (avgWordsPerSentence < 15 && avgSyllablesPerWord < 1.5) {
      complexity = 'simple';
    } else if (avgWordsPerSentence < 25 && avgSyllablesPerWord < 2) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }

    // Tone analysis
    const tone = this.analyzeTone(text);
    const sentiment = this.analyzeSentiment(text);

    return {
      topics,
      readability,
      sentiment: sentiment.label.toLowerCase(),
      keyPhrases,
      wordCount,
      complexity,
      tone
    };
  }

  private extractTopics(text: string): string[] {
    // Simplified topic extraction
    const topicKeywords = {
      technology: ['tech', 'software', 'code', 'programming', 'development', 'api', 'system'],
      business: ['business', 'revenue', 'profit', 'customer', 'market', 'sales', 'strategy'],
      project: ['project', 'deadline', 'milestone', 'task', 'deliverable', 'timeline'],
      meeting: ['meeting', 'call', 'discussion', 'agenda', 'presentation', 'conference'],
      support: ['help', 'support', 'issue', 'problem', 'bug', 'error', 'fix']
    };

    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  private extractKeyPhrases(text: string): string[] {
    // Simplified key phrase extraction
    const phrases = text.match(/\b\w+(?:\s+\w+){1,2}\b/g) || [];
    const phraseCounts = new Map<string, number>();

    phrases.forEach(phrase => {
      const normalized = phrase.toLowerCase().trim();
      if (normalized.length > 5) { // Filter short phrases
        phraseCounts.set(normalized, (phraseCounts.get(normalized) || 0) + 1);
      }
    });

    return Array.from(phraseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase]) => phrase);
  }

  private calculateAvgSyllables(words: string[]): number {
    if (words.length === 0) return 0;
    
    const totalSyllables = words.reduce((sum, word) => {
      return sum + this.countSyllables(word);
    }, 0);
    
    return totalSyllables / words.length;
  }

  private countSyllables(word: string): number {
    // Simplified syllable counting
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i].toLowerCase());
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    // Handle silent e
    if (word.endsWith('e') && count > 1) {
      count--;
    }
    
    return Math.max(1, count);
  }

  private analyzeTone(text: string): 'formal' | 'informal' | 'neutral' {
    const formalIndicators = ['please', 'thank you', 'regards', 'sincerely', 'furthermore', 'however'];
    const informalIndicators = ['hey', 'hi', 'yeah', 'ok', 'cool', 'awesome', 'lol'];
    
    const lowerText = text.toLowerCase();
    const formalCount = formalIndicators.filter(indicator => lowerText.includes(indicator)).length;
    const informalCount = informalIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    if (formalCount > informalCount) return 'formal';
    if (informalCount > formalCount) return 'informal';
    return 'neutral';
  }

  // User Behavior Analysis
  analyzeUserBehavior(userId: string, messages: any[]): UserBehaviorPattern {
    // This would typically analyze historical message data
    const activityByHour = new Array(24).fill(0);
    const channelActivity = new Map<string, number>();
    let totalResponseTime = 0;
    let responseCount = 0;

    messages.forEach(message => {
      const hour = new Date(parseFloat(message.ts) * 1000).getHours();
      activityByHour[hour]++;
      
      const channel = message.channel;
      channelActivity.set(channel, (channelActivity.get(channel) || 0) + 1);
    });

    const peakHours = activityByHour
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    const preferredChannels = Array.from(channelActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channel]) => channel);

    return {
      userId,
      activityPattern: {
        peakHours,
        preferredChannels,
        responseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
        engagementRate: 0.75 // Placeholder
      },
      communicationStyle: {
        averageMessageLength: messages.reduce((sum, m) => sum + (m.text?.length || 0), 0) / messages.length,
        emojiUsage: 0.2, // Placeholder
        formalityScore: 0.5 // Placeholder
      },
      collaborationMetrics: {
        threadsStarted: 0, // Placeholder
        threadsParticipated: 0, // Placeholder
        mentionsGiven: 0, // Placeholder
        mentionsReceived: 0 // Placeholder
      }
    };
  }

  // Team Dynamics Analysis
  analyzeTeamDynamics(teamId: string, members: string[], _interactions: any[]): TeamDynamics {
    // Simplified team dynamics analysis
    const collaborationScore = Math.random() * 0.3 + 0.7; // Placeholder: 0.7-1.0
    
    return {
      teamId,
      collaborationScore,
      communicationFlow: {
        centralFigures: members.slice(0, 2), // Placeholder
        isolatedMembers: [],
        subGroups: [members.slice(0, Math.ceil(members.length / 2))]
      },
      healthMetrics: {
        responseRate: 0.85,
        participationBalance: 0.75,
        conflictIndicators: 0.1
      }
    };
  }

  // Utility methods
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  clearCache(): void {
    this.sentimentCache.clear();
    this.engagementCache.clear();
    this.logger.info('AI Analytics cache cleared');
  }

  // Channel name analysis for creation
  analyzeChannelName(name: string): {
    appropriateness: number;
    suggestions: string[];
    sentiment: string;
  } {
    const sentiment = this.analyzeSentiment(name);
    const appropriateness = this.calculateChannelNameAppropriateness(name);
    const suggestions = this.generateChannelNameSuggestions(name);

    return {
      appropriateness,
      suggestions,
      sentiment: sentiment.label.toLowerCase()
    };
  }

  private calculateChannelNameAppropriateness(name: string): number {
    let score = 0.8; // Base score

    // Length check
    if (name.length >= 3 && name.length <= 15) {
      score += 0.1;
    } else {
      score -= 0.2;
    }

    // Format check
    if (/^[a-z0-9-_]+$/.test(name)) {
      score += 0.1;
    } else {
      score -= 0.3;
    }

    // Meaningful name check
    if (name.includes('-') || name.includes('_')) {
      score += 0.05; // Structured naming
    }

    return Math.max(0, Math.min(1, score));
  }

  private generateChannelNameSuggestions(name: string): string[] {
    const suggestions: string[] = [];
    
    if (name.length > 21) {
      suggestions.push('Consider shortening the channel name');
    }
    
    if (!/^[a-z0-9-_]+$/.test(name)) {
      suggestions.push('Use only lowercase letters, numbers, hyphens, and underscores');
    }
    
    if (name.startsWith('-') || name.endsWith('-')) {
      suggestions.push('Avoid starting or ending with hyphens');
    }

    return suggestions;
  }
}

export const AIAnalytics = new AIAnalyticsClass();
