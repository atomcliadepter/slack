const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Enhanced MCP Slack SDK v2.0.0');
console.log('==========================================');

const server = spawn('node', [path.join(__dirname, '../dist/index.js')], {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit'
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
});
