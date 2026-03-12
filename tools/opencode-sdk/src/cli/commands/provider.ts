import chalk from 'chalk';
import { Command } from 'commander';
import { getOptions } from '../api/client.js';
import { withCommandHandler, helpTextBuilder } from '../utils/command-wrapper.js';

export const providerCommand = new Command('provider').description('Manage AI providers');

// list
providerCommand
  .command('list')
  .description('List all AI providers')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc provider list'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.provider.list({
          query: { directory: options.directory } as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const data = result.data as any;
          const all: any[] = data.all || [];
          const connected: string[] = data.connected || [];

          console.log(chalk.bold(`\nAI Providers (${all.length}):\n`));
          console.log(chalk.green(`Connected: ${connected.length}`));
          connected.forEach((id: string) => {
            console.log(`  ${chalk.green('✓')} ${id}`);
          });

          console.log(chalk.gray(`\nAvailable: ${all.length - connected.length}`));
          const available = all.filter((p: any) => !connected.includes(p.id || p));
          available.slice(0, 20).forEach((p: any) => {
            const id = typeof p === 'string' ? p : p.id;
            console.log(`  ${chalk.gray('○')} ${id}`);
          });
          if (available.length > 20) {
            console.log(chalk.gray(`  ... and ${available.length - 20} more`));
          }
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading providers...' }
    )
  );

// auth
providerCommand
  .command('auth')
  .description('Check provider authentication status')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc provider auth'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.provider.auth({
          query: { directory: options.directory } as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(chalk.bold('\nProvider Authentication Status:\n'));
          console.log(JSON.stringify(result.data, null, 2));
        }
      },
      { showSpinner: true, spinnerMessage: 'Checking authentication status...' }
    )
  );
