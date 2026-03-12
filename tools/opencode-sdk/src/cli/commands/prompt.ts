import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { getOptions } from '../api/client.js';
import { withCommandHandler, helpTextBuilder } from '../utils/command-wrapper.js';
import { parseModel } from '../utils/model.js';
import { streamResponse } from '../utils/streaming.js';

export const promptCommand = new Command('prompt')
  .description('Send a message to an AI session')
  .argument('<message>', 'Message contents')
  .requiredOption('-s, --session <session-id>', 'Session ID (required)')
  .option('-d, --directory <path>', 'Project directory')
  .option('--model <model>', 'Model name (format: provider/model or model)')
  .option('--agent <agent>', 'Agent name')
  .option('--stream', 'Stream the output response')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc prompt "Explain this code" --session abc-123'],
      notes: ['Requires an active session. You can create one via `oc session create`.'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const message = command.args[0];

        if (!options.session) {
          throw {
            code: 'MISSING_ARGUMENT',
            message: 'Must specify the --session <session-id> option',
            suggestion: 'Provide a valid session ID. View with `oc session list`.',
          };
        }

        if (!message || message.trim() === '') {
          throw {
            code: 'INVALID_ARGUMENT',
            message: 'Message cannot be empty',
            suggestion: 'Provide a valid text message to send to the AI.',
          };
        }

        const sessionId = options.session;

        if (options.stream) {
          console.log(chalk.bold('\nSending message...\n'));
          console.log(chalk.gray(`Session: ${sessionId}`));
          console.log(chalk.gray(`Message: ${message}\n`));
          console.log(chalk.bold('AI Response:\n'));

          const eventSource = await streamResponse({
            sessionId,
            directory: options.directory,
          });

          eventSource.onopen = async () => {
            try {
              await api.session.promptAsync({
                path: { id: sessionId },
                query: { directory: options.directory } as object,
                body: {
                  parts: [{ type: 'text', text: message }] as any,
                  model: options.model ? parseModel(options.model) : undefined,
                  agent: options.agent,
                } as any,
              });
            } catch (error: any) {
              console.error(
                chalk.red('\n✗ [REQUEST_FAILED] Failed to trigger stream response:'),
                error.message
              );
              eventSource.close();
              process.exit(1);
            }
          };

          // Return null so the wrapper finishes properly without standard output
          return null;
        } else {
          const spinner = ora('Sending message...').start();
          let result;
          try {
            result = await api.session.prompt({
              path: { id: sessionId },
              query: { directory: options.directory } as object,
              body: {
                parts: [{ type: 'text', text: message }] as any,
                model: options.model ? parseModel(options.model) : undefined,
                agent: options.agent,
              } as any,
            });
          } finally {
            spinner.stop();
          }

          const opts = getOptions();
          if (opts.output === 'json') {
            console.log(JSON.stringify(result.data, null, 2));
          } else {
            const data = result.data as Record<string, any>;
            const parts: any[] = data.parts || [];
            const textParts = parts.filter((p) => p.type === 'text' && p.text);

            if (textParts.length > 0) {
              console.log(chalk.bold('\nAI Response:\n'));
              textParts.forEach((p) => {
                console.log(p.text);
              });
            } else {
              console.log(chalk.gray('\n(Response contains no text content)'));
            }

            if (data.info) {
              const info = data.info;
              console.log(chalk.gray('\n---'));
              if (info.cost !== undefined) {
                console.log(chalk.gray(`Cost: $${(info.cost / 1000000).toFixed(4)}`));
              }
              if (info.tokens) {
                console.log(
                  chalk.gray(
                    `Tokens: Input ${info.tokens.input || 0}, Output ${info.tokens.output || 0}`
                  )
                );
              }
            }
          }
        }
      },
      { showSpinner: false }
    )
  );
