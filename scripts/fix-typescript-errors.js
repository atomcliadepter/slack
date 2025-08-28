#!/usr/bin/env node

/**
 * Script to systematically fix common TypeScript errors across the codebase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const toolsDir = path.join(__dirname, '../src/tools');

// Common TypeScript error patterns and their fixes
const fixes = [
  {
    pattern: /let recommendations = \[\];/g,
    replacement: 'let recommendations: string[] = [];',
    description: 'Fix implicit any[] type for recommendations'
  },
  {
    pattern: /let analytics = \{\};/g,
    replacement: 'let analytics: any = {};',
    description: 'Fix implicit any type for analytics'
  },
  {
    pattern: /(\w+)\[(\w+)\] = \((\w+)\[(\w+)\] \|\| 0\) \+ 1;/g,
    replacement: '$1[$2 as keyof typeof $1] = (($1[$2 as keyof typeof $1] as number) || 0) + 1;',
    description: 'Fix index signature errors'
  },
  {
    pattern: /generateBookmarkRecommendations\(([^,]+), ([^)]+)\)/g,
    replacement: 'generateBookmarkRecommendations($1)',
    description: 'Fix function signature for generateBookmarkRecommendations'
  },
  {
    pattern: /generateDeletionRecommendations\(([^,]+), ([^)]+)\)/g,
    replacement: 'generateDeletionRecommendations($1)',
    description: 'Fix function signature for generateDeletionRecommendations'
  },
  {
    pattern: /generateHistoryRecommendations\(([^,]+), ([^)]+)\)/g,
    replacement: 'generateHistoryRecommendations($1)',
    description: 'Fix function signature for generateHistoryRecommendations'
  },
  {
    pattern: /generateChannelRecommendations\(([^,]+), ([^)]+)\)/g,
    replacement: 'generateChannelRecommendations($1)',
    description: 'Fix function signature for generateChannelRecommendations'
  },
  {
    pattern: /generateMarkRecommendations\(([^,]+), ([^)]+)\)/g,
    replacement: 'generateMarkRecommendations($1)',
    description: 'Fix function signature for generateMarkRecommendations'
  }
];

function fixFile(filePath) {
  console.log(`Fixing ${filePath}...`);
  
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
    console.log(`  ✅ Fixed ${filePath}`);
  } else {
    console.log(`  ⏭️  No changes needed for ${filePath}`);
  }
}

function fixAllTools() {
  console.log('🔧 Starting TypeScript error fixes...\n');
  
  const toolFiles = fs.readdirSync(toolsDir)
    .filter(file => file.endsWith('.ts'))
    .map(file => path.join(toolsDir, file));
  
  toolFiles.forEach(fixFile);
  
  console.log('\n✅ TypeScript error fixes completed!');
  console.log('\n🧪 Running build test...');
  
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Build successful!');
  } catch (error) {
    console.log('❌ Build still has errors. Manual fixes needed.');
    console.log('Run: npm run build to see remaining errors');
  }
}

if (require.main === module) {
  fixAllTools();
}

module.exports = { fixFile, fixes };
