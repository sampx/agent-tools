/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */

// 使用 require 避免 TypeScript 编译时的模块解析问题
// @ts-ignore - Auto-generated SDK
const { Configuration, DefaultApi } = require('../../index.js');

export interface CliOptions {
  server: string;
  output: 'table' | 'json';
  debug: boolean;
}

const DEFAULT_SERVER = 'http://127.0.0.1:3456';

let _api: any = null;
let _options: CliOptions = {
  server: DEFAULT_SERVER,
  output: 'table',
  debug: false,
};

export function setOptions(options: Partial<CliOptions>): void {
  _options = { ..._options, ...options };
  _api = null; // Reset API client when options change
}

export function getOptions(): CliOptions {
  return { ..._options };
}

export function getApi(): any {
  if (!_api) {
    const config = new Configuration({
      basePath: _options.server,
    });
    _api = new DefaultApi(config);
  }
  return _api;
}
