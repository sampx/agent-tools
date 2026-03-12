import chalk from 'chalk';
// @ts-ignore
import { EventSource } from 'eventsource';
import { getOptions } from '../api/client.js';

export interface StreamOptions {
  sessionId: string;
  directory?: string;
  showCompletionHint?: boolean;
  timeoutMs?: number;
  onDelta?: (delta: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export async function streamResponse(options: StreamOptions): Promise<EventSource> {
  const opts = getOptions();
  const {
    sessionId,
    directory,
    showCompletionHint = true,
    timeoutMs = 60000, // Default 60 seconds timeout for no activity
    onDelta,
    onComplete,
    onError,
  } = options;

  const eventUrl = `${opts.server}/event${directory ? `?directory=${encodeURIComponent(directory)}` : ''}`;

  let isComplete = false;
  let timeoutTimer: NodeJS.Timeout;

  const eventSource = new EventSource(eventUrl);

  const cleanup = () => {
    isComplete = true;
    if (timeoutTimer) clearTimeout(timeoutTimer);
    eventSource.close();
    process.removeListener('SIGINT', handleSignal);
    process.removeListener('SIGTERM', handleSignal);
  };

  const handleSignal = () => {
    console.log(chalk.yellow('\n\n⚠ Stream interrupted by user'));
    cleanup();
    process.exit(0);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  const resetTimeout = () => {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(() => {
      if (!isComplete) {
        const errorMsg = 'Connection timed out due to inactivity';
        if (onError) onError(errorMsg);
        else console.error(chalk.red(`\n✗ [TIMEOUT] ${errorMsg}`));
        cleanup();
      }
    }, timeoutMs);
  };

  resetTimeout();

  eventSource.onmessage = (event: any) => {
    resetTimeout();
    try {
      const data = JSON.parse(event.data);
      if (data.properties?.sessionID !== sessionId) return;

      switch (data.type) {
        case 'message.part.delta':
          if (data.properties?.delta) {
            if (onDelta) {
              onDelta(data.properties.delta);
            } else {
              process.stdout.write(data.properties.delta);
            }
          }
          break;

        case 'session.idle':
          cleanup();
          if (showCompletionHint) {
            console.log(chalk.gray('\n\n--- Response Complete ---'));
          }
          if (onComplete) onComplete();
          break;

        case 'session.error': {
          const errorMessage = data.properties?.error || 'Unknown error occurred';
          if (onError) {
            onError(errorMessage);
          } else {
            console.error(chalk.red('\n✗ [STREAM_ERROR]'), errorMessage);
          }
          cleanup();
          break;
        }
      }
    } catch (e) {
      // Ignore parse errors from unknown events
    }
  };

  eventSource.onerror = () => {
    if (!isComplete) {
      const errorMsg = 'Connection error occurred';
      if (onError) {
        onError(errorMsg);
      } else {
        console.error(chalk.red(`\n✗ [NETWORK_ERROR] ${errorMsg}`));
      }
    }
    cleanup();
  };

  return eventSource;
}
