
import { slackUploadFileTool } from '../../../../src/tools/slackUploadFile';
import { skipIntegration, mockValidArgs, mockInvalidArgs, createTestFile, cleanupTestFile } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Upload File Integration Tests', () => {
  beforeAll(async () => {
    if (!skipIntegration) {
      await createTestFile();
    }
  });

  afterAll(async () => {
    if (!skipIntegration) {
      await cleanupTestFile();
    }
  });


  describe('Validation Tests', () => {
    test('should reject empty arguments', async () => {
      const result = await slackUploadFileTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should reject empty channel', async () => {
      const result = await slackUploadFileTool.execute(mockInvalidArgs.uploadFile[1]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel is required');
    });

    test('should reject empty file path', async () => {
      const result = await slackUploadFileTool.execute(mockInvalidArgs.uploadFile[2]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('File path is required');
    });

    test('should reject non-existent file', async () => {
      const result = await slackUploadFileTool.execute(mockInvalidArgs.uploadFile[3]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('File does not exist');
    });
  });

  describe('Integration Tests', () => {
    test('should upload file successfully', async () => {

      const result = await slackUploadFileTool.execute(mockValidArgs.uploadFile);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.file).toBeDefined();
      expect(result.data.file.name).toBeDefined();
      expect(result.data.file.title).toBe(mockValidArgs.uploadFile.title);
      expect(result.data.channel).toBe(mockValidArgs.uploadFile.channel);
    });

    test('should upload file with comment', async () => {

      const result = await slackUploadFileTool.execute({
        ...mockValidArgs.uploadFile,
        comment: 'This is a test file upload with comment'
      });
      
      expect(result.success).toBe(true);
      expect(result.data.file).toBeDefined();
    });

    test('should handle non-existent channel gracefully', async () => {

      const result = await slackUploadFileTool.execute({
        ...mockValidArgs.uploadFile,
        channel: 'nonexistent-channel-12345'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel_not_found');
    });
  });

  describe('Edge Cases', () => {
    test('should handle file without title', async () => {

      const result = await slackUploadFileTool.execute({
        channel: mockValidArgs.uploadFile.channel,
        filePath: mockValidArgs.uploadFile.filePath
      });
      
      expect(result.success).toBe(true);
      expect(result.data.file).toBeDefined();
    });

    test('should handle very long file title', async () => {

      const longTitle = 'A'.repeat(255); // Very long title
      const result = await slackUploadFileTool.execute({
        ...mockValidArgs.uploadFile,
        title: longTitle
      });
      
      expect(result.success).toBe(true);
      expect(result.data.file.title).toBeDefined();
    });

    test('should handle special characters in title', async () => {

      const specialTitle = 'Test file with émojis 🚀 and spëcial chars!';
      const result = await slackUploadFileTool.execute({
        ...mockValidArgs.uploadFile,
        title: specialTitle
      });
      
      expect(result.success).toBe(true);
      expect(result.data.file.title).toBe(specialTitle);
    });
  });
});
