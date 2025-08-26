"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = globalSetup;
/**
 * Global test setup - runs once before all tests
 */
const dotenv_1 = __importDefault(require("dotenv"));
async function globalSetup() {
    // Load environment variables
    dotenv_1.default.config();
    // Skip integration tests in CI environment
    if (process.env.CI === 'true') {
        console.log('🚀 Running in CI environment - integration tests will be skipped');
        process.env.SKIP_INTEGRATION_TESTS = 'true';
    }
    // Validate required environment variables for integration tests
    if (process.env.SKIP_INTEGRATION_TESTS !== 'true') {
        const requiredEnvVars = [
            'SLACK_BOT_TOKEN',
            'SLACK_SIGNING_SECRET',
        ];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
            console.warn('Integration tests will be skipped. Set SKIP_INTEGRATION_TESTS=true to suppress this warning.');
            process.env.SKIP_INTEGRATION_TESTS = 'true';
        }
        else {
            console.log('✅ Environment variables validated - integration tests enabled');
        }
    }
    console.log('🧪 Global test setup completed');
}
//# sourceMappingURL=globalSetup.js.map