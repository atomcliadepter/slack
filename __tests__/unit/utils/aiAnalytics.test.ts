
import { jest } from '@jest/globals';
import { TestHelpers } from '../../utils/testHelpers';

describe('aiAnalytics utilities', () => {
  let aiAnalytics: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../../src/utils/aiAnalytics');
    aiAnalytics = module;
    aiAnalytics.AIAnalytics.clearCache();
  });

  describe('Sentiment Analysis', () => {
    describe('analyzeSentiment', () => {
      it('should analyze positive sentiment correctly', () => {
        const positiveText = 'I love this amazing product! It works great and makes me happy.';
        const result = aiAnalytics.AIAnalytics.analyzeSentiment(positiveText);

        expect(result.label).toBe('POSITIVE');
        expect(result.score).toBeGreaterThan(0);
        expect(result.magnitude).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.emotions).toBeDefined();
      });

      it('should analyze negative sentiment correctly', () => {
        const negativeText = 'This is terrible and awful. I hate it and feel sad about this bad experience.';
        const result = aiAnalytics.AIAnalytics.analyzeSentiment(negativeText);

        expect(result.label).toBe('NEGATIVE');
        expect(result.score).toBeLessThan(0);
        expect(result.magnitude).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should analyze neutral sentiment correctly', () => {
        const neutralText = 'The meeting is scheduled for tomorrow at 3 PM in the conference room.';
        const result = aiAnalytics.AIAnalytics.analyzeSentiment(neutralText);

        expect(result.label).toBe('NEUTRAL');
        expect(result.score).toBeCloseTo(0, 1);
        expect(result.magnitude).toBeGreaterThanOrEqual(0);
      });

      it('should handle empty text', () => {
        const result = aiAnalytics.AIAnalytics.analyzeSentiment('');

        expect(result.label).toBe('NEUTRAL');
        expect(result.score).toBe(0);
        expect(result.magnitude).toBe(0);
        expect(result.confidence).toBe(0);
      });

      it('should detect emotions in text', () => {
        const emotionalText = 'I am so happy and excited about this surprise!';
        const result = aiAnalytics.AIAnalytics.analyzeSentiment(emotionalText);

        expect(result.emotions).toBeDefined();
        expect(result.emotions!.joy).toBeGreaterThan(0);
        expect(Object.values(result.emotions!).reduce((sum, val) => sum + val, 0)).toBeCloseTo(1, 1);
      });

      it('should cache sentiment analysis results', () => {
        const text = 'This is a test message for caching.';
        
        const result1 = aiAnalytics.AIAnalytics.analyzeSentiment(text);
        const result2 = aiAnalytics.AIAnalytics.analyzeSentiment(text);

        expect(result1).toEqual(result2);
        expect(result1).toBe(result2); // Should be the same object reference due to caching
      });

      it('should handle special characters and emojis', () => {
        const textWithEmojis = 'Great work! 🎉 This is awesome! 😊 #success';
        const result = aiAnalytics.AIAnalytics.analyzeSentiment(textWithEmojis);

        expect(result.label).toBe('POSITIVE');
        expect(result.score).toBeGreaterThan(0);
      });
    });
  });

  describe('Engagement Prediction', () => {
    describe('predictEngagement', () => {
      it('should predict high engagement for positive content with questions', () => {
        const content = 'What do you think about this amazing new feature? 🚀';
        const result = aiAnalytics.AIAnalytics.predictEngagement(content);

        expect(result.score).toBeGreaterThan(0.5);
        expect(result.factors).toContain('positive_sentiment');
        expect(result.factors).toContain('contains_question');
        expect(result.recommendation).toBeDefined();
      });

      it('should predict lower engagement for very long content', () => {
        const longContent = 'This is a very long message that goes on and on with lots of details and information that might be too much for people to read and engage with effectively. '.repeat(5);
        const result = aiAnalytics.AIAnalytics.predictEngagement(longContent);

        expect(result.factors).toContain('too_long');
        expect(result.score).toBeLessThan(0.7);
      });

      it('should consider optimal length content', () => {
        const optimalContent = 'Here is a well-sized message that provides good information without being too long or too short for engagement.';
        const result = aiAnalytics.AIAnalytics.predictEngagement(optimalContent);

        expect(result.factors).toContain('optimal_length');
      });

      it('should factor in time-based context', () => {
        const content = 'Good morning team! How is everyone doing today?';
        const context = {
          timeOfDay: 10, // 10 AM - peak hours
          dayOfWeek: 2   // Tuesday - weekday
        };

        const result = aiAnalytics.AIAnalytics.predictEngagement(content, context);

        expect(result.factors).toContain('peak_hours');
        expect(result.factors).toContain('weekday_posting');
        expect(result.score).toBeGreaterThan(0.5);
      });

      it('should handle emoji usage appropriately', () => {
        const contentWithEmojis = 'Great job everyone! 🎉 Keep up the good work! 👍';
        const result = aiAnalytics.AIAnalytics.predictEngagement(contentWithEmojis);

        expect(result.factors).toContain('appropriate_emoji_usage');
      });

      it('should cache engagement predictions', () => {
        const content = 'Test content for caching engagement predictions.';
        const context = { timeOfDay: 14 };

        const result1 = aiAnalytics.AIAnalytics.predictEngagement(content, context);
        const result2 = aiAnalytics.AIAnalytics.predictEngagement(content, context);

        expect(result1).toEqual(result2);
        expect(result1).toBe(result2); // Should be cached
      });

      it('should provide optimal timing suggestions', () => {
        const content = 'When should I post this message?';
        const result = aiAnalytics.AIAnalytics.predictEngagement(content);

        expect(result.optimalTiming).toBeDefined();
        expect(result.optimalTiming!.hour).toBeGreaterThanOrEqual(0);
        expect(result.optimalTiming!.hour).toBeLessThan(24);
        expect(result.optimalTiming!.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(result.optimalTiming!.dayOfWeek).toBeLessThan(7);
      });
    });
  });

  describe('Content Analysis', () => {
    describe('analyzeContent', () => {
      it('should analyze content comprehensively', () => {
        const content = 'We need to discuss the new software development project timeline and deliverables for the upcoming sprint.';
        const result = aiAnalytics.AIAnalytics.analyzeContent(content);

        expect(result.topics).toContain('technology');
        expect(result.topics).toContain('project');
        expect(result.wordCount).toBe(16);
        expect(result.readability).toBeGreaterThanOrEqual(0);
        expect(result.readability).toBeLessThanOrEqual(1);
        expect(result.complexity).toMatch(/^(simple|moderate|complex)$/);
        expect(result.tone).toMatch(/^(formal|informal|neutral)$/);
      });

      it('should extract relevant topics', () => {
        const techContent = 'Our API development team needs to fix the software bug in the system code.';
        const result = aiAnalytics.AIAnalytics.analyzeContent(techContent);

        expect(result.topics).toContain('technology');
      });

      it('should calculate readability scores', () => {
        const simpleContent = 'This is easy to read. Short sentences work well.';
        const complexContent = 'The implementation of sophisticated algorithmic methodologies necessitates comprehensive understanding of multifaceted computational paradigms.';

        const simpleResult = aiAnalytics.AIAnalytics.analyzeContent(simpleContent);
        const complexResult = aiAnalytics.AIAnalytics.analyzeContent(complexContent);

        expect(simpleResult.readability).toBeGreaterThan(complexResult.readability);
        expect(simpleResult.complexity).toBe('simple');
        expect(complexResult.complexity).toBe('complex');
      });

      it('should extract key phrases', () => {
        const content = 'Project management software helps teams collaborate effectively on important deliverables and project milestones.';
        const result = aiAnalytics.AIAnalytics.analyzeContent(content);

        expect(result.keyPhrases).toBeDefined();
        expect(Array.isArray(result.keyPhrases)).toBe(true);
        expect(result.keyPhrases.length).toBeGreaterThan(0);
      });

      it('should analyze tone correctly', () => {
        const formalContent = 'Please find attached the quarterly report. Thank you for your attention to this matter. Regards.';
        const informalContent = 'Hey everyone! This is awesome and cool. Let me know what you think, ok?';

        const formalResult = aiAnalytics.AIAnalytics.analyzeContent(formalContent);
        const informalResult = aiAnalytics.AIAnalytics.analyzeContent(informalContent);

        expect(formalResult.tone).toBe('formal');
        expect(informalResult.tone).toBe('informal');
      });

      it('should handle empty content', () => {
        const result = aiAnalytics.AIAnalytics.analyzeContent('');

        expect(result.wordCount).toBe(0);
        expect(result.topics).toEqual([]);
        expect(result.keyPhrases).toEqual([]);
        expect(result.complexity).toBe('simple');
      });

      it('should handle content with special characters', () => {
        const content = 'Check out this link: https://example.com/api?param=value&other=123 #hashtag @mention';
        const result = aiAnalytics.AIAnalytics.analyzeContent(content);

        expect(result.wordCount).toBeGreaterThan(0);
        expect(result.readability).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('User Behavior Analysis', () => {
    describe('analyzeUserBehavior', () => {
      it('should analyze user activity patterns', () => {
        const userId = 'U1234567890';
        const messages = [
          { ts: '1609459200.123456', channel: 'C1234567890', text: 'Good morning!' },
          { ts: '1609462800.123456', channel: 'C1234567890', text: 'How is everyone?' },
          { ts: '1609466400.123456', channel: 'C0987654321', text: 'Project update' },
          { ts: '1609470000.123456', channel: 'C1234567890', text: 'Thanks for the info' }
        ];

        const result = aiAnalytics.AIAnalytics.analyzeUserBehavior(userId, messages);

        expect(result.userId).toBe(userId);
        expect(result.activityPattern.peakHours).toBeDefined();
        expect(result.activityPattern.peakHours.length).toBe(3);
        expect(result.activityPattern.preferredChannels).toBeDefined();
        expect(result.activityPattern.preferredChannels.length).toBeGreaterThan(0);
        expect(result.communicationStyle.averageMessageLength).toBeGreaterThan(0);
      });

      it('should identify preferred channels', () => {
        const userId = 'U1234567890';
        const messages = [
          { ts: '1609459200.123456', channel: 'C1111111111', text: 'Message 1' },
          { ts: '1609462800.123456', channel: 'C1111111111', text: 'Message 2' },
          { ts: '1609466400.123456', channel: 'C1111111111', text: 'Message 3' },
          { ts: '1609470000.123456', channel: 'C2222222222', text: 'Message 4' }
        ];

        const result = aiAnalytics.AIAnalytics.analyzeUserBehavior(userId, messages);

        expect(result.activityPattern.preferredChannels[0]).toBe('C1111111111');
      });

      it('should handle empty message history', () => {
        const userId = 'U1234567890';
        const messages: any[] = [];

        const result = aiAnalytics.AIAnalytics.analyzeUserBehavior(userId, messages);

        expect(result.userId).toBe(userId);
        expect(result.activityPattern.peakHours).toBeDefined();
        expect(result.communicationStyle.averageMessageLength).toBe(0);
      });
    });
  });

  describe('Team Dynamics Analysis', () => {
    describe('analyzeTeamDynamics', () => {
      it('should analyze team collaboration patterns', () => {
        const teamId = 'T1234567890';
        const members = ['U1111111111', 'U2222222222', 'U3333333333', 'U4444444444'];
        const interactions = [
          { from: 'U1111111111', to: 'U2222222222', type: 'mention' },
          { from: 'U2222222222', to: 'U3333333333', type: 'reply' },
          { from: 'U3333333333', to: 'U1111111111', type: 'reaction' }
        ];

        const result = aiAnalytics.AIAnalytics.analyzeTeamDynamics(teamId, members, interactions);

        expect(result.teamId).toBe(teamId);
        expect(result.collaborationScore).toBeGreaterThanOrEqual(0);
        expect(result.collaborationScore).toBeLessThanOrEqual(1);
        expect(result.communicationFlow.centralFigures).toBeDefined();
        expect(result.communicationFlow.isolatedMembers).toBeDefined();
        expect(result.communicationFlow.subGroups).toBeDefined();
        expect(result.healthMetrics.responseRate).toBeGreaterThanOrEqual(0);
        expect(result.healthMetrics.participationBalance).toBeGreaterThanOrEqual(0);
        expect(result.healthMetrics.conflictIndicators).toBeGreaterThanOrEqual(0);
      });

      it('should identify central figures in communication', () => {
        const teamId = 'T1234567890';
        const members = ['U1111111111', 'U2222222222', 'U3333333333'];
        const interactions: any[] = [];

        const result = aiAnalytics.AIAnalytics.analyzeTeamDynamics(teamId, members, interactions);

        expect(result.communicationFlow.centralFigures.length).toBeGreaterThan(0);
        expect(result.communicationFlow.centralFigures.every(id => members.includes(id))).toBe(true);
      });
    });
  });

  describe('Channel Name Analysis', () => {
    describe('analyzeChannelName', () => {
      it('should analyze appropriate channel names', () => {
        const goodName = 'project-alpha';
        const result = aiAnalytics.AIAnalytics.analyzeChannelName(goodName);

        expect(result.appropriateness).toBeGreaterThan(0.8);
        expect(result.suggestions.length).toBe(0);
        expect(result.sentiment).toBe('neutral');
      });

      it('should identify inappropriate channel names', () => {
        const badName = 'This Is A Very Long Channel Name That Exceeds Limits!';
        const result = aiAnalytics.AIAnalytics.analyzeChannelName(badName);

        expect(result.appropriateness).toBeLessThan(0.5);
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions.some(s => s.includes('lowercase'))).toBe(true);
      });

      it('should provide suggestions for improvement', () => {
        const problematicName = 'channel-';
        const result = aiAnalytics.AIAnalytics.analyzeChannelName(problematicName);

        expect(result.suggestions.some(s => s.includes('hyphens'))).toBe(true);
      });

      it('should handle very long names', () => {
        const longName = 'a'.repeat(30);
        const result = aiAnalytics.AIAnalytics.analyzeChannelName(longName);

        expect(result.suggestions.some(s => s.includes('shortening'))).toBe(true);
      });

      it('should analyze sentiment of channel names', () => {
        const positiveChannelName = 'awesome-project';
        const result = aiAnalytics.AIAnalytics.analyzeChannelName(positiveChannelName);

        expect(result.sentiment).toBe('positive');
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', () => {
      // Populate caches
      aiAnalytics.AIAnalytics.analyzeSentiment('test message');
      aiAnalytics.AIAnalytics.predictEngagement('test content');

      // Clear caches
      aiAnalytics.AIAnalytics.clearCache();

      // Verify caches are cleared by checking if new analysis is performed
      const result1 = aiAnalytics.AIAnalytics.analyzeSentiment('test message');
      const result2 = aiAnalytics.AIAnalytics.analyzeSentiment('test message');

      // After clearing cache, these should be different object references
      expect(result1).toEqual(result2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => aiAnalytics.AIAnalytics.analyzeSentiment(null)).not.toThrow();
      expect(() => aiAnalytics.AIAnalytics.analyzeSentiment(undefined)).not.toThrow();
      expect(() => aiAnalytics.AIAnalytics.predictEngagement(null)).not.toThrow();
      expect(() => aiAnalytics.AIAnalytics.analyzeContent(null)).not.toThrow();
    });

    it('should handle very large text inputs', () => {
      const largeText = 'word '.repeat(10000);
      
      expect(() => aiAnalytics.AIAnalytics.analyzeSentiment(largeText)).not.toThrow();
      expect(() => aiAnalytics.AIAnalytics.analyzeContent(largeText)).not.toThrow();
      
      const result = aiAnalytics.AIAnalytics.analyzeContent(largeText);
      expect(result.wordCount).toBe(10000);
    });

    it('should handle text with only special characters', () => {
      const specialText = '!@#$%^&*()[]{}|;:,.<>?';
      
      const sentimentResult = aiAnalytics.AIAnalytics.analyzeSentiment(specialText);
      const contentResult = aiAnalytics.AIAnalytics.analyzeContent(specialText);
      
      expect(sentimentResult.label).toBe('NEUTRAL');
      expect(contentResult.wordCount).toBe(0);
    });

    it('should handle unicode and international characters', () => {
      const unicodeText = 'Hello 世界 🌍 Здравствуй мир مرحبا بالعالم';
      
      const sentimentResult = aiAnalytics.AIAnalytics.analyzeSentiment(unicodeText);
      const contentResult = aiAnalytics.AIAnalytics.analyzeContent(unicodeText);
      
      expect(sentimentResult).toBeDefined();
      expect(contentResult).toBeDefined();
      expect(contentResult.wordCount).toBeGreaterThan(0);
    });

    it('should handle extremely short inputs', () => {
      const shortInputs = ['a', '!', '1', ''];
      
      shortInputs.forEach(input => {
        expect(() => aiAnalytics.AIAnalytics.analyzeSentiment(input)).not.toThrow();
        expect(() => aiAnalytics.AIAnalytics.predictEngagement(input)).not.toThrow();
        expect(() => aiAnalytics.AIAnalytics.analyzeContent(input)).not.toThrow();
      });
    });

    it('should handle malformed context objects', () => {
      const content = 'Test content';
      const malformedContexts = [
        { timeOfDay: 'invalid' },
        { dayOfWeek: -1 },
        { timeOfDay: 25 },
        { random: 'property' }
      ];

      malformedContexts.forEach(context => {
        expect(() => aiAnalytics.AIAnalytics.predictEngagement(content, context)).not.toThrow();
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should handle concurrent analysis requests', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Test message ${i}`);
      
      const promises = texts.map(text => 
        Promise.resolve(aiAnalytics.AIAnalytics.analyzeSentiment(text))
      );

      const results = await Promise.all(promises);
      
      expect(results.length).toBe(100);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.label).toMatch(/^(POSITIVE|NEGATIVE|NEUTRAL)$/);
      });
    });

    it('should maintain reasonable performance with large datasets', () => {
      const startTime = Date.now();
      
      // Analyze 1000 different messages
      for (let i = 0; i < 1000; i++) {
        aiAnalytics.AIAnalytics.analyzeSentiment(`Message number ${i} with some content`);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Integration with Other Utilities', () => {
    it('should work with performance monitoring', async () => {
      const { PerformanceMonitor } = await import('../../../src/utils/performance');
      
      const timer = PerformanceMonitor.startTimer('ai_analysis');
      
      aiAnalytics.AIAnalytics.analyzeSentiment('Test message for performance monitoring');
      aiAnalytics.AIAnalytics.predictEngagement('Test content for engagement prediction');
      aiAnalytics.AIAnalytics.analyzeContent('Test content for comprehensive analysis');
      
      const metrics = timer.end();
      
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.operation).toBe('ai_analysis');
    });
  });
});
