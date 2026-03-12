#!/usr/bin/env node

import { Command } from 'commander';
import { setOptions, DEFAULT_SERVER } from './api/client.js';
import { globalCommand } from './commands/global.js';
import { sessionCommand } from './commands/session.js';
import { projectCommand } from './commands/project.js';
import { providerCommand } from './commands/provider.js';
import { configCommand } from './commands/config.js';
import { fileCommand, findCommand } from './commands/file.js';
import { promptCommand } from './commands/prompt.js';

const program = new Command();

program
  .name('oc-cli')
  .description('Interact with the OpenCode Background Server')
  .version('1.0.0');

// Global Options
program.configureHelp({ showGlobalOptions: true });
program
  .option('--server <url>', 'OpenCode server endpoint', DEFAULT_SERVER)
  .option('--json', 'Output list or query results in JSON format');

program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.optsWithGlobals();
  setOptions({
    server: opts.server,
    output: opts.json ? 'json' : 'table',
  });
});

// Register Commands
program.addCommand(globalCommand);
program.addCommand(sessionCommand);
program.addCommand(projectCommand);
program.addCommand(providerCommand);
program.addCommand(configCommand);
program.addCommand(fileCommand);
program.addCommand(findCommand);
program.addCommand(promptCommand);

const applyGlobalOpts = (cmd: Command) => {
  cmd.configureHelp({ showGlobalOptions: true });
  cmd.commands.forEach(applyGlobalOpts);
};
applyGlobalOpts(program);

// Parse arguments (preAction hook will trigger setup automatically)
program.parse();