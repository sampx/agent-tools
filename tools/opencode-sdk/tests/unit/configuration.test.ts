/**
 * SDK Configuration Unit Tests
 * Tests the createOpencodeClient function of @opencode-ai/sdk
 */

import { describe, it, expect } from 'vitest';
import { createOpencodeClient } from '@opencode-ai/sdk';

describe('createOpencodeClient', () => {
  it('should create a configured API client', () => {
    const api = createOpencodeClient();
    expect(api).toBeDefined();
    expect(typeof api).toBe('object');
  });

  it('should accept baseUrl configuration correctly', () => {
    const api = createOpencodeClient({ baseUrl: 'http://127.0.0.1:20000' });
    expect(api).toBeDefined();
  });

  it('should allow custom fetch options injection', () => {
    const api = createOpencodeClient({
      baseUrl: 'http://127.0.0.1:20000',
      fetch: async (request: Request) => {
        return new Response();
      }
    });
    expect(api).toBeDefined();
  });
});
