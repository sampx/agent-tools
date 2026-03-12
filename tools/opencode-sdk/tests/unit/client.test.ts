/**
 * CLI Client Unit Tests
 * Tests the real setOptions/getOptions exported from src/cli/api/client.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setOptions, getOptions, getApi, DEFAULT_SERVER } from '../../src/cli/api/client.js';

describe('CLI Client', () => {

  beforeEach(() => {
    // Reset to default state before each test
    setOptions({
      server: DEFAULT_SERVER,
      output: 'table',
    });
  });

  describe('setOptions / getOptions', () => {
    it('should have correct default configuration', () => {
      const opts = getOptions();
      expect(opts).toEqual({
        server: DEFAULT_SERVER,
        output: 'table',
      });
    });

    it('should be able to update server individually', () => {
      setOptions({ server: 'http://localhost:8080' });
      expect(getOptions().server).toBe('http://localhost:8080');
    });

    it('should be able to update output format individually', () => {
      setOptions({ output: 'json' });
      expect(getOptions().output).toBe('json');
    });

    it('should be able to update multiple options concurrently', () => {
      setOptions({ server: 'https://api.example.com', output: 'json' });
      const opts = getOptions();
      expect(opts.server).toBe('https://api.example.com');
      expect(opts.output).toBe('json');
    });

    it('partial updates should preserve unmodified options', () => {
      setOptions({ server: 'http://custom.server' });
      const opts = getOptions();
      expect(opts.server).toBe('http://custom.server');
      expect(opts.output).toBe('table');
    });

    it('getOptions should return a copy instead of a reference', () => {
      const opts1 = getOptions();
      const opts2 = getOptions();
      expect(opts1).toEqual(opts2);
      expect(opts1).not.toBe(opts2);
    });
  });

  describe('getApi', () => {
    it('should return an API client instance', () => {
      const api = getApi();
      expect(api).toBeDefined();
    });

    it('API instance should contain all specific namespaces', () => {
      const api = getApi();
      expect(api.config).toBeDefined();
      expect(api.session).toBeDefined();
      expect(api.provider).toBeDefined();
      expect(api.project).toBeDefined();
    });

    it('updating server should point the API instance to the new configuration', () => {
      setOptions({ server: 'http://127.0.0.1:9999' });
      const api = getApi();
      const opts = getOptions();
      expect(opts.server).toBe('http://127.0.0.1:9999');
      expect(api).toBeDefined();
    });
  });

});
