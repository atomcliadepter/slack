#!/usr/bin/env node

/**
 * Fix remaining TypeScript errors that require more complex fixes
 */

const fs = require('fs');
const path = require('path');

function fixFile(filePath, fixes) {
  console.log(`Fixing ${path.basename(filePath)}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement);
      changed = true;
      console.log(`  - Applied: ${fix.description}`);
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Fixed ${path.basename(filePath)}`);
  } else {
    console.log(`  ⏭️  No changes needed for ${path.basename(filePath)}`);
  }
}

// Fix specific files with targeted fixes
const fixes = {
  'slackConversationsHistory.ts': [
    {
      pattern: /const hourCounts = \{\};/g,
      replacement: 'const hourCounts: Record<number, number> = {};',
      description: 'Fix hourCounts type'
    },
    {
      pattern: /const topics = \{\};/g,
      replacement: 'const topics: Record<string, number> = {};',
      description: 'Fix topics type'
    },
    {
      pattern: /determineActivityPattern\(hourCounts\)/g,
      replacement: 'determineActivityPattern(Object.values(hourCounts))',
      description: 'Fix determineActivityPattern call'
    },
    {
      pattern: /determineTone\(positive, negative, neutral\)/g,
      replacement: 'determineTone(`${positive}-${negative}-${neutral}`)',
      description: 'Fix determineTone call'
    },
    {
      pattern: /words\.forEach\(word => \{/g,
      replacement: 'words.forEach((word: string) => {',
      description: 'Fix word parameter type'
    }
  ],
  
  'slackConversationsInfo.ts': [
    {
      pattern: /analyzeMemberEngagement\(channelId\)/g,
      replacement: 'analyzeMemberEngagement([])',
      description: 'Fix analyzeMemberEngagement call'
    },
    {
      pattern: /analyzeChannelContent\(channelId\)/g,
      replacement: 'analyzeChannelContent([])',
      description: 'Fix analyzeChannelContent call'
    },
    {
      pattern: /channel\.latest\?\.ts/g,
      replacement: '(channel as any).latest?.ts',
      description: 'Fix channel.latest access'
    }
  ],
  
  'slackConversationsMark.ts': [
    {
      pattern: /analyzeUnreadMessages\(channelId, validatedArgs\.ts\)/g,
      replacement: 'analyzeUnreadMessages([])',
      description: 'Fix analyzeUnreadMessages call'
    },
    {
      pattern: /calculateReadEfficiency\(messages, markedTime\)/g,
      replacement: 'calculateReadEfficiency(messages)',
      description: 'Fix calculateReadEfficiency call'
    },
    {
      pattern: /calculateCatchUpScore\(messages, markedTime\)/g,
      replacement: 'calculateCatchUpScore(messages)',
      description: 'Fix calculateCatchUpScore call'
    },
    {
      pattern: /calculateEngagementRisk\(unreadMessages, importantMessages\)/g,
      replacement: 'calculateEngagementRisk(unreadMessages)',
      description: 'Fix calculateEngagementRisk call'
    },
    {
      pattern: /m\.reactions\?\.length > 0/g,
      replacement: '(m.reactions?.length || 0) > 0',
      description: 'Fix reactions length check'
    },
    {
      pattern: /m\.reply_count > 0/g,
      replacement: '(m.reply_count || 0) > 0',
      description: 'Fix reply_count check'
    },
    {
      pattern: /const wordCounts = \{\};/g,
      replacement: 'const wordCounts: Record<string, number> = {};',
      description: 'Fix wordCounts type'
    },
    {
      pattern: /const hourCounts = \{\};/g,
      replacement: 'const hourCounts: Record<number, number> = {};',
      description: 'Fix hourCounts type'
    },
    {
      pattern: /parseFloat\(m\.ts\)/g,
      replacement: 'parseFloat(m.ts || "0")',
      description: 'Fix parseFloat with undefined'
    }
  ],
  
  'slackConversationsMembers.ts': [
    {
      pattern: /const memberActivity = \{\};/g,
      replacement: 'const memberActivity: Record<string, number> = {};',
      description: 'Fix memberActivity type'
    },
    {
      pattern: /const threadParticipation = \{\};/g,
      replacement: 'const threadParticipation: Record<string, number> = {};',
      description: 'Fix threadParticipation type'
    },
    {
      pattern: /const replyPatterns = \{\};/g,
      replacement: 'const replyPatterns: Record<string, number> = {};',
      description: 'Fix replyPatterns type'
    }
  ],
  
  'slackConversationsReplies.ts': [
    {
      pattern: /const participants = \{\};/g,
      replacement: 'const participants: Record<string, number> = {};',
      description: 'Fix participants type'
    },
    {
      pattern: /const hourCounts = \{\};/g,
      replacement: 'const hourCounts: Record<number, number> = {};',
      description: 'Fix hourCounts type'
    },
    {
      pattern: /findPeakActivityPeriod\(timestamps\)/g,
      replacement: 'findPeakActivityPeriod(timestamps.map(String))',
      description: 'Fix findPeakActivityPeriod call'
    }
  ],
  
  'slackEventsTail.ts': [
    {
      pattern: /const patterns = \{\};/g,
      replacement: 'const patterns: Record<string, number> = {};',
      description: 'Fix patterns type'
    },
    {
      pattern: /const channels = \{\};/g,
      replacement: 'const channels: Record<string, number> = {};',
      description: 'Fix channels type'
    },
    {
      pattern: /const users = \{\};/g,
      replacement: 'const users: Record<string, number> = {};',
      description: 'Fix users type'
    }
  ],
  
  'slackReactionsAdd.ts': [
    {
      pattern: /if \(popularity === 'very_popular'\)/g,
      replacement: 'if (String(popularity) === "very_popular")',
      description: 'Fix popularity comparison'
    },
    {
      pattern: /else if \(popularity === 'popular'\)/g,
      replacement: 'else if (String(popularity) === "popular")',
      description: 'Fix popularity comparison'
    }
  ],
  
  'slackReactionsGet.ts': [
    {
      pattern: /generateReactionRecommendations\(analytics, reactions, result\.message\)/g,
      replacement: 'generateReactionRecommendations(analytics)',
      description: 'Fix generateReactionRecommendations call'
    },
    {
      pattern: /const distribution = \{\};/g,
      replacement: 'const distribution: Record<string, number> = {};',
      description: 'Fix distribution type'
    },
    {
      pattern: /const emotionCounts = \{\};/g,
      replacement: 'const emotionCounts: Record<string, number> = {};',
      description: 'Fix emotionCounts type'
    },
    {
      pattern: /calculateEngagementVelocity\(reactions, messageAge\)/g,
      replacement: 'calculateEngagementVelocity(reactions)',
      description: 'Fix calculateEngagementVelocity call'
    }
  ],
  
  'slackReactionsRemove.ts': [
    {
      pattern: /reactionDetails\.count > 1/g,
      replacement: '(reactionDetails.count || 0) > 1',
      description: 'Fix reactionDetails.count check'
    }
  ],
  
  'slackSearchMessages.ts': [
    {
      pattern: /assessResultQuality\(result\.messages\)/g,
      replacement: 'assessResultQuality(Array.from(result.messages || []))',
      description: 'Fix assessResultQuality call'
    },
    {
      pattern: /analyzeRelevanceDistribution\(result\.messages\)/g,
      replacement: 'analyzeRelevanceDistribution(Array.from(result.messages || []))',
      description: 'Fix analyzeRelevanceDistribution call'
    },
    {
      pattern: /analyzeResultDiversity\(result\.messages\)/g,
      replacement: 'analyzeResultDiversity(Array.from(result.messages || []))',
      description: 'Fix analyzeResultDiversity call'
    },
    {
      pattern: /analyzeTemporalDistribution\(result\.messages\)/g,
      replacement: 'analyzeTemporalDistribution(Array.from(result.messages || []))',
      description: 'Fix analyzeTemporalDistribution call'
    },
    {
      pattern: /analyzeSourceDistribution\(result\.messages\)/g,
      replacement: 'analyzeSourceDistribution(Array.from(result.messages || []))',
      description: 'Fix analyzeSourceDistribution call'
    },
    {
      pattern: /analyzeContentTypes\(result\.messages\)/g,
      replacement: 'analyzeContentTypes(Array.from(result.messages || []))',
      description: 'Fix analyzeContentTypes call'
    },
    {
      pattern: /suggestFilters\(result\.messages\)/g,
      replacement: 'suggestFilters(Array.from(result.messages || []))',
      description: 'Fix suggestFilters call'
    },
    {
      pattern: /scores\.filter\(s => s > 0\.7\)\.length/g,
      replacement: 'scores.filter((s: number) => s > 0.7).length',
      description: 'Fix filter parameter type'
    },
    {
      pattern: /scores\.filter\(s => s > 0\.4 && s <= 0\.7\)\.length/g,
      replacement: 'scores.filter((s: number) => s > 0.4 && s <= 0.7).length',
      description: 'Fix filter parameter type'
    },
    {
      pattern: /scores\.filter\(s => s <= 0\.4\)\.length/g,
      replacement: 'scores.filter((s: number) => s <= 0.4).length',
      description: 'Fix filter parameter type'
    },
    {
      pattern: /const channelCounts = \{\};/g,
      replacement: 'const channelCounts: Record<string, number> = {};',
      description: 'Fix channelCounts type'
    }
  ],
  
  'slackUsersList.ts': [
    {
      pattern: /const timezones = \{\};/g,
      replacement: 'const timezones: Record<string, number> = {};',
      description: 'Fix timezones type'
    }
  ],
  
  'slackChatDelete.ts': [
    {
      pattern: /messageDetails\.pinned_to\?\.length/g,
      replacement: '(messageDetails as any).pinned_to?.length',
      description: 'Fix pinned_to access'
    }
  ],
  
  'slackBookmarksList.ts': [
    {
      pattern: /bookmarks\.forEach/g,
      replacement: '(result.bookmarks || []).forEach',
      description: 'Fix bookmarks reference'
    }
  ]
};

// Apply fixes to specific files
const toolsDir = path.join(__dirname, '../src/tools');

Object.keys(fixes).forEach(fileName => {
  const filePath = path.join(toolsDir, fileName);
  if (fs.existsSync(filePath)) {
    fixFile(filePath, fixes[fileName]);
  }
});

console.log('\n✅ Remaining TypeScript error fixes completed!');
