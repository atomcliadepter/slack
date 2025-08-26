#!/usr/bin/env ts-node

import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

// Import all tools
import { slackSendMessageTool } from '../src/tools/slackSendMessage';
import { slackGetWorkspaceInfoTool } from '../src/tools/slackGetWorkspaceInfo';
import { slackGetUserInfoTool } from '../src/tools/slackGetUserInfo';
import { slackGetChannelHistoryTool } from '../src/tools/slackGetChannelHistory';
import { slackSearchMessagesTool } from '../src/tools/slackSearchMessages';
import { slackCreateChannelTool } from '../src/tools/slackCreateChannel';
import { slackSetStatusTool } from '../src/tools/slackSetStatus';
import { slackUploadFileTool } from '../src/tools/slackUploadFile';

interface BenchmarkResult {
  toolName: string;
  operation: string;
  executionTime: number;
  success: boolean;
  error?: string;
  memoryUsage: NodeJS.MemoryUsage;
}

interface BenchmarkSummary {
  timestamp: string;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  memoryStats: {
    averageHeapUsed: number;
    peakHeapUsed: number;
    averageExternal: number;
  };
  results: BenchmarkResult[];
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private hasSlackToken: boolean;

  constructor() {
    this.hasSlackToken = !!process.env.SLACK_BOT_TOKEN;
  }

  private async measureExecution<T>(
    toolName: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    let success = false;
    let error: string | undefined;

    try {
      await fn();
      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      toolName,
      operation,
      executionTime: endTime - startTime,
      success,
      error,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
      }
    };
  }

  async runValidationBenchmarks(): Promise<void> {
    console.log('🔍 Running validation benchmarks...');

    // Test validation performance for each tool
    const validationTests = [
      {
        tool: slackSendMessageTool,
        name: 'slack_send_message',
        validArgs: { channel: 'test', text: 'test' },
        invalidArgs: {}
      },
      {
        tool: slackGetWorkspaceInfoTool,
        name: 'slack_get_workspace_info',
        validArgs: {},
        invalidArgs: null // No invalid args for this tool
      },
      {
        tool: slackGetUserInfoTool,
        name: 'slack_get_user_info',
        validArgs: { userId: 'U1234567890' },
        invalidArgs: {}
      },
      {
        tool: slackGetChannelHistoryTool,
        name: 'slack_get_channel_history',
        validArgs: { channel: 'test', limit: 10 },
        invalidArgs: {}
      },
      {
        tool: slackSearchMessagesTool,
        name: 'slack_search_messages',
        validArgs: { query: 'test', limit: 5 },
        invalidArgs: {}
      },
      {
        tool: slackCreateChannelTool,
        name: 'slack_create_channel',
        validArgs: { name: 'test-channel' },
        invalidArgs: {}
      },
      {
        tool: slackSetStatusTool,
        name: 'slack_set_status',
        validArgs: { text: 'test', emoji: ':test:' },
        invalidArgs: {}
      },
      {
        tool: slackUploadFileTool,
        name: 'slack_upload_file',
        validArgs: { channel: 'test', filePath: '/tmp/test.txt' },
        invalidArgs: {}
      }
    ];

    for (const test of validationTests) {
      // Test with valid args (will fail at API level without token, but validation should pass)
      const validResult = await this.measureExecution(
        test.name,
        'validation_valid_args',
        async () => {
          await test.tool.execute(test.validArgs);
        }
      );
      this.results.push(validResult);

      // Test with invalid args (should fail at validation level)
      if (test.invalidArgs !== null) {
        const invalidResult = await this.measureExecution(
          test.name,
          'validation_invalid_args',
          async () => {
            await test.tool.execute(test.invalidArgs);
          }
        );
        this.results.push(invalidResult);
      }
    }
  }

  async runIntegrationBenchmarks(): Promise<void> {
    if (!this.hasSlackToken) {
      console.log('⚠️  Skipping integration benchmarks - no Slack token configured');
      return;
    }

    console.log('🚀 Running integration benchmarks...');

    // Test actual API calls (only if token is available)
    const integrationTests = [
      {
        tool: slackGetWorkspaceInfoTool,
        name: 'slack_get_workspace_info',
        args: {}
      },
      {
        tool: slackGetUserInfoTool,
        name: 'slack_get_user_info',
        args: { userId: 'USLACKBOT' }
      }
    ];

    for (const test of integrationTests) {
      const result = await this.measureExecution(
        test.name,
        'api_call',
        async () => {
          await test.tool.execute(test.args);
        }
      );
      this.results.push(result);
    }
  }

  async runConcurrencyBenchmarks(): Promise<void> {
    console.log('⚡ Running concurrency benchmarks...');

    // Test concurrent validation calls
    const concurrentPromises = Array.from({ length: 10 }, (_, i) =>
      this.measureExecution(
        'slack_send_message',
        `concurrent_validation_${i}`,
        async () => {
          await slackSendMessageTool.execute({ channel: 'test', text: 'test' });
        }
      )
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    this.results.push(...concurrentResults);
  }

  generateSummary(): BenchmarkSummary {
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.length - successfulTests;
    const totalExecutionTime = this.results.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = totalExecutionTime / this.results.length;

    const heapUsages = this.results.map(r => r.memoryUsage.heapUsed);
    const averageHeapUsed = heapUsages.reduce((sum, h) => sum + h, 0) / heapUsages.length;
    const peakHeapUsed = Math.max(...heapUsages);

    const externalUsages = this.results.map(r => r.memoryUsage.external);
    const averageExternal = externalUsages.reduce((sum, e) => sum + e, 0) / externalUsages.length;

    return {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      successfulTests,
      failedTests,
      averageExecutionTime,
      totalExecutionTime,
      memoryStats: {
        averageHeapUsed,
        peakHeapUsed,
        averageExternal
      },
      results: this.results
    };
  }

  async saveBenchmarkResults(summary: BenchmarkSummary): Promise<void> {
    const outputPath = path.join(__dirname, '../docs/benchmark-results.json');
    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Benchmark results saved to: ${outputPath}`);
  }

  printSummary(summary: BenchmarkSummary): void {
    console.log('\n📈 BENCHMARK SUMMARY');
    console.log('===================');
    console.log(`Timestamp: ${summary.timestamp}`);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Successful: ${summary.successfulTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Success Rate: ${((summary.successfulTests / summary.totalTests) * 100).toFixed(2)}%`);
    console.log(`Average Execution Time: ${summary.averageExecutionTime.toFixed(2)}ms`);
    console.log(`Total Execution Time: ${summary.totalExecutionTime.toFixed(2)}ms`);
    console.log(`Average Heap Used: ${(summary.memoryStats.averageHeapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Peak Heap Used: ${(summary.memoryStats.peakHeapUsed / 1024 / 1024).toFixed(2)}MB`);

    console.log('\n🏆 TOP PERFORMERS (by execution time):');
    const sortedResults = [...summary.results]
      .filter(r => r.success)
      .sort((a, b) => a.executionTime - b.executionTime)
      .slice(0, 5);

    sortedResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.toolName} (${result.operation}): ${result.executionTime.toFixed(2)}ms`);
    });

    console.log('\n⚠️  SLOWEST OPERATIONS:');
    const slowestResults = [...summary.results]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 5);

    slowestResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.toolName} (${result.operation}): ${result.executionTime.toFixed(2)}ms ${result.success ? '✅' : '❌'}`);
    });
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting Enhanced MCP Slack SDK Performance Benchmark');
  console.log('========================================================');

  const benchmark = new PerformanceBenchmark();

  try {
    await benchmark.runValidationBenchmarks();
    await benchmark.runIntegrationBenchmarks();
    await benchmark.runConcurrencyBenchmarks();

    const summary = benchmark.generateSummary();
    benchmark.printSummary(summary);
    await benchmark.saveBenchmarkResults(summary);

    console.log('\n✅ Benchmark completed successfully!');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { PerformanceBenchmark, BenchmarkResult, BenchmarkSummary };
