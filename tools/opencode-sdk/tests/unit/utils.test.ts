/**
 * CLI Utilities Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { parseModel } from '../../src/cli/utils/model.js';

describe('parseModel', () => {
  it('should parse provider/model format', () => {
    const result = parseModel('openai/gpt-4');
    expect(result).toEqual({
      providerID: 'openai',
      modelID: 'gpt-4',
    });
  });

  it('should parse model-only format', () => {
    const result = parseModel('gpt-4');
    expect(result).toEqual({
      providerID: '',
      modelID: 'gpt-4',
    });
  });

  it('should correctly parse model including multiple slashes correctly', () => {
    const result = parseModel('openai/custom/gpt-4');
    // It should now correctly interpret slashes after the first one as part of the model name
    expect(result.providerID).toBe('openai');
    expect(result.modelID).toBe('custom/gpt-4');
  });

  it('should handle trailing spaces or empty string gracefully', () => {
    const resultEmpty = parseModel('');
    expect(resultEmpty).toEqual({
      providerID: '',
      modelID: '',
    });

    const resultSpaced = parseModel('  anthropic/claude-3-opus  ');
    expect(resultSpaced).toEqual({
      providerID: 'anthropic',
      modelID: 'claude-3-opus',
    });
  });
});
