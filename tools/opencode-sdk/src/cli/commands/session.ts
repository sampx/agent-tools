import chalk from 'chalk';
import { Command } from 'commander';
import { getOptions } from '../api/client.js';
import { formatTable, formatSuccess } from '../output/format.js';
import { withCommandHandler, helpTextBuilder } from '../utils/command-wrapper.js';

export const sessionCommand = new Command('session').description('Manage AI developer sessions');

interface SessionData {
  id: string;
  title?: string;
  time?: { created: number; updated: number };
  summary?: { additions: number; deletions: number; files: number };
}

interface MessageData {
  id: string;
  role?: string;
  time?: string;
}

// list - List Sessions
sessionCommand
  .command('list')
  .description('List all sessions')
  .option('-d, --directory <path>', 'Project directory')
  .option('--search <text>', 'Search keywords')
  .option('--limit <n>', 'Limit count', '20')
  .option('--roots', 'Show root sessions only')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc session list', 'oc session list --roots', 'oc session list --search "bugfix"'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.session.list({
          query: {
            directory: options.directory,
            roots: options.roots,
            search: options.search,
            limit: parseInt(options.limit),
          } as unknown as Record<string, unknown>,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const sessions = (result.data || []) as unknown as SessionData[];
          console.log(chalk.bold(`\nSession List (${sessions.length}):\n`));
          const mappedSessions = sessions.map(s => ({
            id: s.id,
            title: s.title,
            updated: s.time?.updated ? new Date(s.time.updated).toLocaleString() : '-',
            files: s.summary?.files ?? 0
          }));
          formatTable(
            mappedSessions as unknown as Record<string, unknown>[],
            ['id', 'title', 'files', 'updated'],
            ['ID', 'Title', 'Files', 'Updated At']
          );
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading session list...' }
    )
  );

// create - Create Session
sessionCommand
  .command('create')
  .description('Create a new session')
  .option('-d, --directory <path>', 'Project directory')
  .option('--title <title>', 'Session title')
  .option('--parent <id>', 'Parent session ID')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc session create', 'oc session create --title "Fix login validation"'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.session.create({
          query: { directory: options.directory },
          body: {
            title: options.title,
            parentID: options.parent,
          } as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          formatSuccess('Session successfully created');
          const data = result.data as unknown as SessionData;
          console.log(`  ID: ${data.id}`);
          if (data.title) {
            console.log(`  Title: ${data.title}`);
          }
        }
      },
      { showSpinner: true, spinnerMessage: 'Creating session...' }
    )
  );

// get - View Session Details
sessionCommand
  .command('get <session-id>')
  .description('View session details')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc session get abc-123-def'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        // The command argument holds parsed args. We can access the session id via positional arg:
        const sessionId = command.args[0];

        const result = await api.session.messages({
          path: { id: sessionId },
          query: { directory: options.directory } as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(chalk.bold(`\nSession: ${sessionId}\n`));
          const messages = (result.data || []) as any[];
          const mappedMessages = messages.map(m => ({
            id: m.info?.id || '-',
            role: m.info?.role ? chalk.cyan(m.info.role) : '-',
            time: m.info?.time?.created ? new Date(m.info.time.created).toLocaleString() : '-',
          }));
          formatTable(
            mappedMessages as unknown as Record<string, unknown>[],
            ['id', 'role', 'time'],
            ['Message_ID', 'Role', 'Time']
          );
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading session details...' }
    )
  );

// delete - Delete Session
sessionCommand
  .command('delete <session-id>')
  .description('Delete session by ID')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc session delete abc-123-def'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const sessionId = command.args[0];
        await api.session.delete({
          path: { id: sessionId },
          query: { directory: options.directory } as object,
        });
        formatSuccess(`Session ${sessionId} deleted`);
      },
      { showSpinner: true, spinnerMessage: 'Deleting session...' }
    )
  );

// abort - Abort Session
sessionCommand
  .command('abort <session-id>')
  .description('Abort an ongoing session')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc session abort abc-123-def'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const sessionId = command.args[0];
        await api.session.abort({
          path: { id: sessionId },
          query: { directory: options.directory } as object,
        });
        formatSuccess(`Session ${sessionId} aborted`);
      },
      { showSpinner: true, spinnerMessage: 'Aborting session...' }
    )
  );

// messages - View Message List
sessionCommand
  .command('messages <session-id>')
  .description('View session message list')
  .option('-d, --directory <path>', 'Project directory')
  .option('--limit <n>', 'Limit count', '50')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc session messages abc-123-def --limit 100'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const sessionId = command.args[0];
        const result = await api.session.messages({
          path: { id: sessionId },
          query: {
            directory: options.directory,
            limit: Number(options.limit),
          } as unknown as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const messages = (result.data || []) as any[];
          console.log(chalk.bold(`\nSession Messages (${messages.length}):\n`));
          const mappedMessages = messages.map(m => ({
            id: m.info?.id || '-',
            role: m.info?.role ? chalk.cyan(m.info.role) : '-',
            time: m.info?.time?.created ? new Date(m.info.time.created).toLocaleString() : '-',
          }));
          formatTable(
            mappedMessages as unknown as Record<string, unknown>[],
            ['id', 'role', 'time'],
            ['Message_ID', 'Role', 'Time']
          );
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading messages...' }
    )
  );
