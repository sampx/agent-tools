/**
 * Configuration 类单元测试
 */

import { describe, it, expect } from 'vitest';
import { Configuration } from '../../configuration.js';

describe('Configuration', () => {
  it('should create configuration with default values', () => {
    const config = new Configuration();
    expect(config.basePath).toBeUndefined();
    expect(config.apiKey).toBeUndefined();
    expect(config.username).toBeUndefined();
    expect(config.password).toBeUndefined();
    expect(config.accessToken).toBeUndefined();
  });

  it('should create configuration with basePath', () => {
    const config = new Configuration({
      basePath: 'http://127.0.0.1:3456',
    });
    expect(config.basePath).toBe('http://127.0.0.1:3456');
  });

  it('should create configuration with apiKey', () => {
    const config = new Configuration({
      apiKey: 'test-api-key',
    });
    expect(config.apiKey).toBe('test-api-key');
  });

  it('should create configuration with username and password', () => {
    const config = new Configuration({
      username: 'admin',
      password: 'secret',
    });
    expect(config.username).toBe('admin');
    expect(config.password).toBe('secret');
  });

  it('should create configuration with accessToken', () => {
    const config = new Configuration({
      accessToken: 'Bearer token123',
    });
    expect(config.accessToken).toBe('Bearer token123');
  });

  it('should create configuration with baseOptions', () => {
    const baseOptions = {
      headers: {
        'X-Custom-Header': 'value',
      },
      timeout: 5000,
    };

    const config = new Configuration({ baseOptions });
    // Configuration 类会合并 headers，timeout 会被保留
    expect(config.baseOptions?.headers).toEqual({
      'X-Custom-Header': 'value',
    });
    expect(config.baseOptions?.timeout).toBe(5000);
  });

  it('should merge headers in baseOptions', () => {
    const config = new Configuration({
      baseOptions: {
        headers: {
          'X-Existing': 'value',
        },
      },
    });

    expect(config.baseOptions?.headers).toEqual({
      'X-Existing': 'value',
    });
  });

  describe('isJsonMime', () => {
    it('should identify JSON MIME types', () => {
      const config = new Configuration();

      expect(config.isJsonMime('application/json')).toBe(true);
      expect(config.isJsonMime('application/json; charset=UTF8')).toBe(true);
      expect(config.isJsonMime('APPLICATION/JSON')).toBe(true);
      expect(config.isJsonMime('application/vnd.company+json')).toBe(true);
      expect(config.isJsonMime('application/json-patch+json')).toBe(true);
    });

    it('should reject non-JSON MIME types', () => {
      const config = new Configuration();

      expect(config.isJsonMime('text/plain')).toBe(false);
      expect(config.isJsonMime('application/xml')).toBe(false);
      expect(config.isJsonMime('image/png')).toBe(false);
      expect(config.isJsonMime('')).toBe(false);
    });

    it('should handle null input', () => {
      const config = new Configuration();
      expect(config.isJsonMime(null as any)).toBe(false);
    });
  });

  describe('AWS v4 configuration', () => {
    it('should accept AWS v4 configuration', () => {
      const awsv4Config = {
        options: {
          region: 'us-east-1',
          service: 's3',
        },
        credentials: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
      };

      const config = new Configuration({ awsv4: awsv4Config });
      expect(config.awsv4).toEqual(awsv4Config);
    });
  });
});
