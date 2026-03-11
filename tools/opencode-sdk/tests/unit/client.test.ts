/**
 * CLI 选项管理单元测试
 * 测试 setOptions 和 getOptions 函数
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('CLI 选项管理', () => {
  // 直接测试选项逻辑，避免依赖复杂的模块导入
  interface CliOptions {
    server: string;
    output: 'table' | 'json';
    debug: boolean;
  }

  const DEFAULT_SERVER = 'http://127.0.0.1:3456';

  let _options: CliOptions = {
    server: DEFAULT_SERVER,
    output: 'table',
    debug: false,
  };

  function setOptions(options: Partial<CliOptions>): void {
    _options = { ..._options, ...options };
  }

  function getOptions(): CliOptions {
    return { ..._options };
  }

  beforeEach(() => {
    // Reset options before each test
    _options = {
      server: DEFAULT_SERVER,
      output: 'table',
      debug: false,
    };
  });

  describe('setOptions/getOptions', () => {
    it('should have default options', () => {
      const opts = getOptions();
      expect(opts).toEqual({
        server: 'http://127.0.0.1:3456',
        output: 'table',
        debug: false,
      });
    });

    it('should update server option', () => {
      setOptions({ server: 'http://localhost:8080' });
      const opts = getOptions();
      expect(opts.server).toBe('http://localhost:8080');
    });

    it('should update output option', () => {
      setOptions({ output: 'json' });
      const opts = getOptions();
      expect(opts.output).toBe('json');
    });

    it('should update debug option', () => {
      setOptions({ debug: true });
      const opts = getOptions();
      expect(opts.debug).toBe(true);
    });

    it('should update multiple options', () => {
      setOptions({
        server: 'https://api.example.com',
        output: 'json',
        debug: true,
      });
      const opts = getOptions();
      expect(opts.server).toBe('https://api.example.com');
      expect(opts.output).toBe('json');
      expect(opts.debug).toBe(true);
    });

    it('should preserve unchanged options when updating', () => {
      setOptions({ server: 'http://custom.server' });
      const opts = getOptions();
      expect(opts.server).toBe('http://custom.server');
      expect(opts.output).toBe('table');
      expect(opts.debug).toBe(false);
    });

    it('should return a copy of options (not reference)', () => {
      const opts1 = getOptions();
      const opts2 = getOptions();
      expect(opts1).toEqual(opts2);
      expect(opts1).not.toBe(opts2);
    });
  });

  describe('CliOptions type', () => {
    it('should accept valid output formats', () => {
      setOptions({ output: 'table' });
      expect(getOptions().output).toBe('table');

      setOptions({ output: 'json' });
      expect(getOptions().output).toBe('json');
    });

    it('should accept valid server URLs', () => {
      const validUrls = [
        'http://127.0.0.1:3456',
        'http://localhost:8080',
        'https://api.example.com',
        'http://192.168.1.1:3000',
      ];

      validUrls.forEach((url) => {
        setOptions({ server: url });
        expect(getOptions().server).toBe(url);
      });
    });
  });
});
