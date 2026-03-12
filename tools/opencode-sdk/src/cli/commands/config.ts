import chalk from 'chalk';
import { Command } from 'commander';
import { getOptions } from '../api/client.js';
import { formatSuccess } from '../output/format.js';
import { withCommandHandler, helpTextBuilder } from '../utils/command-wrapper.js';

export const configCommand = new Command('config').description(
  'Manage system and workspace configuration'
);

// get
configCommand
  .command('get [key]')
  .description('Get configuration values')
  .option('-d, --directory <path>', 'Project directory')
  .option('--global', 'Access global configuration')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc config get', 'oc config get theme', 'oc config get --global'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const key = command.args[0];
        let result;

        if (options.global) {
          result = await api.config.get();
        } else {
          result = await api.config.get({ query: { directory: options.directory } as object });
        }

        const opts = getOptions();
        if (opts.output === 'json') {
          if (key) {
            console.log(JSON.stringify((result.data as any)?.[key], null, 2));
          } else {
            console.log(JSON.stringify(result.data, null, 2));
          }
        } else {
          console.log(chalk.bold('\nConfiguration:\n'));
          if (key) {
            console.log(`  ${key}: ${JSON.stringify((result.data as any)?.[key])}`);
          } else {
            Object.entries(result.data || {}).forEach(([k, v]) => {
              console.log(`  ${k}: ${JSON.stringify(v)}`);
            });
          }
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading configuration...' }
    )
  );

// set
configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .option('-d, --directory <path>', 'Project directory')
  .option('--global', 'Set global configuration')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc config set theme dark', 'oc config set --global log_level debug'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const key = command.args[0];
        const value = command.args[1];

        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }

        if (options.global) {
          const currentConfig = ((await api.config.get()).data as Record<string, unknown>) || {};
          currentConfig[key] = parsedValue;
          await api.config.update({ body: currentConfig as any });
        } else {
          const currentConfig =
            ((await api.config.get({ query: { directory: options.directory } as object }))
              .data as Record<string, unknown>) || {};
          currentConfig[key] = parsedValue;
          await api.config.update({
            query: { directory: options.directory } as object,
            body: currentConfig as any,
          });
        }

        formatSuccess(`Configuration ${key} updated successfully`);
      },
      { showSpinner: true, spinnerMessage: 'Updating configuration...' }
    )
  );

// providers
configCommand
  .command('providers')
  .description('View provider configurations')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc config providers'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.config.providers({
          query: { directory: options.directory } as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(chalk.bold('\nProvider Configurations:\n'));
          console.log(JSON.stringify(result.data, null, 2));
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading provider configurations...' }
    )
  );
