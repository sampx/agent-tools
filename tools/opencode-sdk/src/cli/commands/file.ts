import chalk from 'chalk';
import { Command } from 'commander';
import { getOptions } from '../api/client.js';
import { withCommandHandler, helpTextBuilder } from '../utils/command-wrapper.js';

export const fileCommand = new Command('file').description('File operations');

interface FileData {
  name?: string;
  isDir?: boolean;
  size?: number;
  path?: string;
}

// list
fileCommand
  .command('list <path>')
  .description('List directory contents')
  .option('-d, --directory <project>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc file list ./src'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const targetPath = command.args[0];
        const result = await api.file.list({
          query: { directory: options.directory, path: targetPath },
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const files = (result.data || []) as FileData[];
          console.log(chalk.bold(`\nDirectory: ${targetPath} (${files.length}):\n`));
          files.forEach((f) => {
            const icon = f.isDir ? chalk.blue('📁') : chalk.gray('📄');
            console.log(`  ${icon} ${f.name}`);
          });
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading directory contents...' }
    )
  );

// read
fileCommand
  .command('read <path>')
  .description('Read file contents')
  .option('-d, --directory <project>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc file read package.json'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const targetPath = command.args[0];
        const result = await api.file.read({
          query: { directory: options.directory, path: targetPath },
        });
        console.log(result.data);
      },
      { showSpinner: true, spinnerMessage: 'Reading file...' }
    )
  );

// status
fileCommand
  .command('status')
  .description('View Git file status')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc file status'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.file.status({ query: { directory: options.directory } as object });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(chalk.bold('\nFile Status:\n'));
          console.log(JSON.stringify(result.data, null, 2));
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading file status...' }
    )
  );

export const findCommand = new Command('find').description('Search functionalities');

findCommand
  .command('files <pattern>')
  .description('Find files by name')
  .option('-d, --directory <path>', 'Project directory')
  .option('--type <type>', 'Type filter: file | dir')
  .option('--limit <n>', 'Limit count', '50')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc find files "*.ts"'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const pattern = command.args[0];
        const result = await api.find.files({
          query: {
            directory: options.directory,
            query: pattern,
            dirs: options.type === 'dir' ? 'true' : ('false' as 'true' | 'false'),
          },
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const files = (result.data || []) as FileData[];
          console.log(chalk.bold(`\nMatched Files (${files.length}):\n`));
          files.forEach((f) => {
            console.log(`  ${f.path}`);
          });
        }
      },
      { showSpinner: true, spinnerMessage: 'Searching files...' }
    )
  );

findCommand
  .command('text <pattern>')
  .description('Search text within files')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc find text "TODO"'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const pattern = command.args[0];
        const result = await api.find.text({
          query: { directory: options.directory, pattern },
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const results = (result.data || []) as unknown as { path: string; line: number; content: string }[];
          console.log(chalk.bold(`\nSearch Results (${results.length}):\n`));
          results.forEach((r) => {
            console.log(`${chalk.cyan(r.path)}:${r.line}`);
            console.log(`  ${r.content}`);
          });
        }
      },
      { showSpinner: true, spinnerMessage: 'Searching text...' }
    )
  );

findCommand
  .command('symbols <query>')
  .description('Find occurrences of symbols (functions, classes, variables)')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc find symbols "MyClass"'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options, command) => {
        const queryStr = command.args[0];
        const result = await api.find.symbols({
          query: { directory: options.directory, query: queryStr },
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const symbols = (result.data || []) as unknown as { name: string; kind: string; path: string }[];
          console.log(chalk.bold(`\nSymbols (${symbols.length}):\n`));
          symbols.forEach((s) => {
            console.log(`  ${chalk.cyan(s.name)} ${chalk.gray(`[${s.kind}]`)} ${s.path}`);
          });
        }
      },
      { showSpinner: true, spinnerMessage: 'Searching symbols...' }
    )
  );
