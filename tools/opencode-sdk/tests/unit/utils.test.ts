/**
 * CLI 工具函数单元测试
 */

import { describe, it, expect } from 'vitest';
import { parseModel } from '../../cli/src/utils/model.js';

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

  it('should return empty providerID for model with multiple slashes', () => {
    const result = parseModel('openai/custom/gpt-4');
    // parseModel 只支持 provider/model 格式（单个 /）
    expect(result.providerID).toBe('');
    expect(result.modelID).toBe('openai/custom/gpt-4');
  });

  it('should handle empty string', () => {
    const result = parseModel('');
    expect(result).toEqual({
      providerID: '',
      modelID: '',
    });
  });
});
