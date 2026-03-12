import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk';

export const DEFAULT_SERVER = 'http://127.0.0.1:3456';

export interface CliOptions {
  server: string;
  output: 'table' | 'json';
}

let _options: CliOptions = {
  server: DEFAULT_SERVER,
  output: 'table',
};

let _client: OpencodeClient = createOpencodeClient({ baseUrl: DEFAULT_SERVER });

export function setOptions(options: Partial<CliOptions>): void {
  _options = { ..._options, ...options };
  _client = createOpencodeClient({ baseUrl: _options.server });
}

export function getOptions(): CliOptions {
  return { ..._options };
}

/**
 * Get the official @opencode-ai/sdk instance
 */
export function getApi(): OpencodeClient {
  return _client;
}
