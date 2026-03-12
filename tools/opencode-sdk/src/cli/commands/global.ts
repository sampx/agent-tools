import chalk from 'chalk';
import { Command } from 'commander';
import { getOptions } from '../api/client.js';
import { formatSuccess } from '../output/format.js';
import { withCommandHandler, helpTextBuilder } from '../utils/command-wrapper.js';

export const globalCommand = new Command('global').description('Manage global server state');

// health
globalCommand
  .command('health')
  .description('Check OpenCode server health status')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc global health', 'oc health --server http://localhost:8080'],
      notes: ['Validates if the background process is running correctly'],
    })
  )
  .action(
    withCommandHandler(
      async () => {
        const opts = getOptions();
        const res = await fetch(`${opts.server}/global/health`);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data = await res.json();

        if (opts.output === 'json') {
          console.log(JSON.stringify(data, null, 2));
        } else {
          formatSuccess('Server is running normally');
          console.log(`  Version: ${data.version}`);
          console.log(`  State: ${data.healthy ? 'Healthy' : 'Abnormal'}`);
        }
      },
      { showSpinner: true, spinnerMessage: 'Checking server health...' }
    )
  );

// agents
globalCommand
  .command('agents')
  .description('List all available AI agents')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc global agents', 'oc global agents --json'],
      options: ['-d, --directory <path>   Filter constraints based on project root if supported'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.app.agents({ query: { directory: options.directory } as object });
        const opts = getOptions();

        const agents = result.data as { name: string; description?: string; mode?: string }[];

        if (opts.output === 'json') {
          const simplifiedAgents = agents.map(a => ({
            name: a.name,
            mode: a.mode || 'default',
            description: a.description
          }));
          console.log(JSON.stringify(simplifiedAgents, null, 2));
        } else {
          console.log(chalk.bold(`\nAvailable Agents (${agents.length}):\n`));

          agents.forEach((agent) => {
            console.log(
              `  ${chalk.cyan(agent.name)} ${chalk.gray(`[${agent.mode || 'default'}]`)}`
            );
            if (agent.description) {
              console.log(`    ${chalk.gray(agent.description)}`);
            }
          });
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading agents...' }
    )
  );



// commands
globalCommand
  .command('commands')
  .description('List all available workspace commands')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc global commands', 'oc global commands --json'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.command.list({
          query: { directory: options.directory } as object,
        });
        const opts = getOptions();

        const commands = result.data as { name: string; description?: string }[];

        if (opts.output === 'json') {
          const simplifiedCommands = commands.map(c => ({
            name: c.name,
            description: c.description
          }));
          console.log(JSON.stringify(simplifiedCommands, null, 2));
        } else {
          console.log(chalk.bold(`\nAvailable Commands (${commands.length}):\n`));

          commands.forEach((cmd) => {
            console.log(`  ${chalk.cyan(cmd.name)}`);
            if (cmd.description) {
              console.log(`    ${chalk.gray(cmd.description)}`);
            }
          });
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading commands...' }
    )
  );
