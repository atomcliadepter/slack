
import { jest } from '@jest/globals';
import { TestHelpers } from '../../helpers/testUtils';
import { Validator } from '../../../src/utils/validator';

describe('validator utilities', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('validateChannelId', () => {
    it('should validate correct channel IDs', () => {
      const validChannelIds = [
        'C1234567890',
        'G1234567890', // Private channel
        'D1234567890', // DM
        'CSLACKBOT'
      ];

      validChannelIds.forEach(channelId => {
        expect(Validator.validateChannelId(channelId)).toBe(true);
      });
    });

    it('should reject invalid channel IDs', () => {
      const invalidChannelIds = [
        'invalid',
        '1234567890',
        'C123', // Too short
        'X1234567890', // Wrong prefix
        '',
        null,
        undefined
      ];

      invalidChannelIds.forEach(channelId => {
        expect(Validator.validateChannelId(channelId)).toBe(false);
      });
    });

    it('should validate channel names with # prefix', () => {
      expect(Validator.validateChannelId('#general')).toBe(true);
      expect(Validator.validateChannelId('#test-channel')).toBe(true);
      expect(Validator.validateChannelId('#invalid channel!')).toBe(false);
    });

    it('should validate user mentions with @ prefix', () => {
      expect(Validator.validateChannelId('@username')).toBe(true);
      expect(Validator.validateChannelId('@user.name')).toBe(true);
      expect(Validator.validateChannelId('@invalid user!')).toBe(false);
    });
  });

  describe('validateUserId', () => {
    it('should validate correct user IDs', () => {
      const validUserIds = [
        'U1234567890',
        'B1234567890', // Bot user
        'W1234567890', // Workspace user
        'USLACKBOT'
      ];

      validUserIds.forEach(userId => {
        expect(Validator.validateUserId(userId)).toBe(true);
      });
    });

    it('should reject invalid user IDs', () => {
      const invalidUserIds = [
        'invalid',
        '1234567890',
        'U123', // Too short
        'X1234567890', // Wrong prefix
        '',
        null,
        undefined
      ];

      invalidUserIds.forEach(userId => {
        expect(Validator.validateUserId(userId)).toBe(false);
      });
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        expect(Validator.validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        'test@',
        '@example.com',
        'test.example.com',
        'test@.com',
        'test@com',
        '',
        null,
        undefined
      ];

      invalidEmails.forEach(email => {
        expect(Validator.validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validateTimestamp', () => {
    it('should validate correct Slack timestamps', () => {
      const validTimestamps = [
        '1234567890.123456',
        '1609459200.000000',
        '1234567890.123',
        '1234567890.123456789'
      ];

      validTimestamps.forEach(timestamp => {
        expect(Validator.validateTimestamp(timestamp)).toBe(true);
      });
    });

    it('should reject invalid timestamps', () => {
      const invalidTimestamps = [
        'invalid',
        '1234567890',
        '1234567890.',
        '.123456',
        '12345678901234567890.123456', // Too long
        '',
        null,
        undefined
      ];

      invalidTimestamps.forEach(timestamp => {
        expect(Validator.validateTimestamp(timestamp)).toBe(false);
      });
    });
  });

  describe('validateChannelName', () => {
    it('should validate correct channel names', () => {
      const validNames = [
        'general',
        'test-channel',
        'test_channel',
        'channel123',
        'a',
        'a'.repeat(21) // Max length
      ];

      validNames.forEach(name => {
        expect(Validator.validateChannelName(name)).toBe(true);
      });
    });

    it('should reject invalid channel names', () => {
      const invalidNames = [
        'Invalid Channel!',
        'channel with spaces',
        'UPPERCASE',
        'channel-',
        '_channel',
        'a'.repeat(22), // Too long
        '',
        null,
        undefined
      ];

      invalidNames.forEach(name => {
        expect(Validator.validateChannelName(name)).toBe(false);
      });
    });
  });

  describe('validateMessageText', () => {
    it('should validate correct message text', () => {
      const validTexts = [
        'Hello world!',
        'A'.repeat(40000), // Max length
        'Message with *formatting* and `code`',
        'Message with emoji :smile:',
        'Message with <@U1234567890> mention'
      ];

      validTexts.forEach(text => {
        expect(Validator.validateMessageText(text)).toBe(true);
      });
    });

    it('should reject invalid message text', () => {
      const invalidTexts = [
        'A'.repeat(40001), // Too long
        '',
        '   ', // Only whitespace
        null,
        undefined
      ];

      invalidTexts.forEach(text => {
        expect(Validator.validateMessageText(text)).toBe(false);
      });
    });
  });

  describe('validateJSON', () => {
    it('should validate correct JSON strings', () => {
      const validJSON = [
        '{"key": "value"}',
        '[1, 2, 3]',
        '"string"',
        'true',
        'null',
        '123'
      ];

      validJSON.forEach(json => {
        expect(Validator.validateJSON(json)).toBe(true);
      });
    });

    it('should reject invalid JSON strings', () => {
      const invalidJSON = [
        '{key: "value"}', // Unquoted key
        '{key: value}', // Unquoted value
        '{"key": value}', // Unquoted value
        '{',
        '}',
        'invalid',
        '',
        null,
        undefined
      ];

      invalidJSON.forEach(json => {
        expect(Validator.validateJSON(json)).toBe(false);
      });
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://subdomain.example.com/path?query=value',
        'https://example.com:8080',
        'ftp://files.example.com'
      ];

      validUrls.forEach(url => {
        expect(Validator.validateUrl(url)).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'example.com', // Missing protocol
        'https://',
        'https://.',
        '',
        null,
        undefined
      ];

      invalidUrls.forEach(url => {
        expect(Validator.validateUrl(url)).toBe(false);
      });
    });
  });

  describe('validateFileType', () => {
    it('should validate allowed file types', () => {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'application/pdf',
        'application/json'
      ];

      validTypes.forEach(type => {
        expect(Validator.validateFileType(type)).toBe(true);
      });
    });

    it('should reject disallowed file types', () => {
      const invalidTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'text/x-script',
        '',
        null,
        undefined
      ];

      invalidTypes.forEach(type => {
        expect(Validator.validateFileType(type)).toBe(false);
      });
    });
  });

  describe('validateFileSize', () => {
    it('should validate file sizes within limits', () => {
      const validSizes = [
        1024, // 1KB
        1024 * 1024, // 1MB
        1024 * 1024 * 100 // 100MB (within limit)
      ];

      validSizes.forEach(size => {
        expect(Validator.validateFileSize(size)).toBe(true);
      });
    });

    it('should reject file sizes exceeding limits', () => {
      const invalidSizes = [
        1024 * 1024 * 1024, // 1GB (too large)
        -1, // Negative size
        0, // Zero size
        null,
        undefined
      ];

      invalidSizes.forEach(size => {
        expect(Validator.validateFileSize(size)).toBe(false);
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize potentially dangerous input', () => {
      const testCases = [
        { input: '<script>alert("xss")</script>', expected: 'alert("xss")' },
        { input: 'Normal text', expected: 'Normal text' },
        { input: 'Text with <b>bold</b>', expected: 'Text with bold' },
        { input: '', expected: '' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(Validator.sanitizeInput(input)).toBe(expected);
      });
    });

    it('should handle null and undefined input', () => {
      expect(Validator.sanitizeInput(null)).toBe('');
      expect(Validator.sanitizeInput(undefined)).toBe('');
    });
  });

  describe('validateBlockKit', () => {
    it('should validate correct Block Kit JSON', () => {
      const validBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Hello *world*!'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Click Me'
              },
              action_id: 'button_click'
            }
          ]
        }
      ];

      expect(Validator.validateBlockKit(validBlocks).isValid).toBe(true);
    });

    it('should reject invalid Block Kit JSON', () => {
      const invalidBlocks = [
        { type: 'invalid_type' },
        { type: 'section' }, // Missing required text
        { type: 'section', text: { type: 'invalid_text_type', text: 'Hello' } },
        null,
        undefined,
        'not an array'
      ];

      invalidBlocks.forEach(blocks => {
        expect(Validator.validateBlockKit(blocks).isValid).toBe(false);
      });
    });
  });

  describe('validateAttachments', () => {
    it('should validate correct attachment format', () => {
      const validAttachments = [
        {
          color: 'good',
          text: 'Attachment text',
          fields: [
            {
              title: 'Field Title',
              value: 'Field Value',
              short: true
            }
          ]
        }
      ];

      expect(Validator.validateAttachments(validAttachments)).toBe(true);
    });

    it('should reject invalid attachment format', () => {
      const invalidAttachments = [
        { invalid_field: 'value' },
        { color: 'invalid_color' },
        null,
        undefined,
        'not an array'
      ];

      invalidAttachments.forEach(attachments => {
        expect(Validator.validateAttachments(attachments)).toBe(false);
      });
    });
  });

  describe('Comprehensive Validation', () => {
    it('should validate complete message payload', () => {
      const validPayload = {
        channel: 'C1234567890',
        text: 'Hello world!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Hello *world*!'
            }
          }
        ],
        attachments: [
          {
            color: 'good',
            text: 'Attachment text'
          }
        ]
      };

      const result = Validator.validateMessagePayload(validPayload);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify multiple validation errors', () => {
      const invalidPayload = {
        channel: 'invalid-channel',
        text: '', // Empty text
        blocks: 'invalid blocks', // Should be array
        attachments: { invalid: 'format' } // Should be array
      };

      const result = Validator.validateMessagePayload(invalidPayload);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long inputs gracefully', () => {
      const longString = 'a'.repeat(100000);
      
      // Should not throw errors, just return false for invalid lengths
      expect(() => Validator.validateMessageText(longString)).not.toThrow();
      expect(() => Validator.validateChannelName(longString)).not.toThrow();
    });

    it('should handle special characters in validation', () => {
      const specialChars = '!@#$%^&*()[]{}|;:,.<>?';
      
      expect(Validator.validateChannelName(specialChars)).toBe(false);
      expect(Validator.validateMessageText(specialChars)).toBe(true);
    });

    it('should handle unicode characters', () => {
      const unicodeText = 'Hello 世界 🌍 emoji';
      
      expect(Validator.validateMessageText(unicodeText)).toBe(true);
      expect(Validator.validateChannelName('test-世界')).toBe(false); // Unicode not allowed in channel names
    });
  });
});
