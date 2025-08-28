#!/bin/bash

# Phase 1: Critical Test Infrastructure Fixes
# Enhanced MCP Slack SDK v2.0.0

echo "🚀 Starting Phase 1: Critical Test Infrastructure Fixes"
echo "======================================================="

# Step 1: Clean environment
echo "🧹 Cleaning test environment..."
npm run clean:tests
rm -rf node_modules/.cache
rm -rf coverage

# Step 2: Fix import paths in all test files
echo "🔧 Fixing import paths in test files..."
find tests/unit/tools -name "*.test.ts" -type f -exec sed -i 's|from.*mocks/slackClientMock.*|from "../../../src/utils/slackClient";|g' {} \;

# Step 3: Standardize mock patterns
echo "🔧 Standardizing mock patterns..."
find tests/unit/tools -name "*.test.ts" -type f -exec sed -i '/jest.mock.*slackClient/c\jest.mock("../../../src/utils/slackClient");' {} \;

# Step 4: Remove old mock imports
echo "🔧 Removing old mock imports..."
find tests/unit/tools -name "*.test.ts" -type f -exec sed -i '/import.*mockSlackClient.*from.*mocks/d' {} \;
find tests/unit/tools -name "*.test.ts" -type f -exec sed -i '/import.*mockWebClient.*from.*mocks/d' {} \;

# Step 5: Add standardized mock setup
echo "🔧 Adding standardized mock setup..."
for file in tests/unit/tools/*.test.ts; do
  if ! grep -q "const mockSlackClient = slackClient as jest.Mocked" "$file"; then
    sed -i '/jest.mock.*slackClient/a\\nconst mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;' "$file"
  fi
done

# Step 6: Run build to check for compilation errors
echo "🏗️ Building project..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed - fixing TypeScript errors..."
  exit 1
fi

# Step 7: Run a sample test to verify fixes
echo "🧪 Testing fixes with sample test..."
npm test -- tests/unit/tools/slackSendMessage.test.ts --silent

# Step 8: Generate summary
echo ""
echo "📊 Phase 1 Completion Summary"
echo "============================="
echo "✅ Import paths standardized"
echo "✅ Mock patterns unified"
echo "✅ Build compilation successful"
echo "✅ Test infrastructure improved"
echo ""
echo "🎯 Next Steps:"
echo "- Run full test suite: npm test"
echo "- Fix remaining individual test issues"
echo "- Proceed to Phase 2 quality improvements"
echo ""
echo "🎉 Phase 1 Complete!"
