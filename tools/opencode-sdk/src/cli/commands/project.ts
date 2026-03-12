import chalk from 'chalk';
import { Command } from 'commander';
import { getOptions } from '../api/client.js';
import { formatTable } from '../output/format.js';
import { withCommandHandler, helpTextBuilder } from '../utils/command-wrapper.js';

export const projectCommand = new Command('project').description('Manage workspace projects');

interface ProjectData {
  id: string;
  worktree?: string;
  vcs?: string;
  time?: {
    created: number;
    updated: number;
  };
  sandboxes?: any[];
}

// current
projectCommand
  .command('current')
  .description('Display the current active project')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc project current'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.project.current({
          query: { directory: options.directory } as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const data = result.data as ProjectData;
          console.log(chalk.bold('\nCurrent Project:\n'));
          console.log(`  ID:       ${data.id}`);
          console.log(`  Worktree: ${data.worktree || '-'}`);
          if (data.vcs) console.log(`  VCS:      ${data.vcs}`);
          if (data.time?.updated) {
            console.log(`  Updated:  ${new Date(data.time.updated).toLocaleString()}`);
          }
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading current project...' }
    )
  );

// list
projectCommand
  .command('list')
  .description('List all available projects')
  .option('-d, --directory <path>', 'Project directory')
  .addHelpText(
    'after',
    helpTextBuilder({
      examples: ['oc project list'],
    })
  )
  .action(
    withCommandHandler(
      async (api, options) => {
        const result = await api.project.list({
          query: { directory: options.directory } as object,
        });

        const opts = getOptions();
        if (opts.output === 'json') {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          const projects = (result.data || []) as unknown as ProjectData[];

          const mappedProjects = projects.map(p => ({
            id: p.id || '-',
            worktree: p.worktree || '-',
            vcs: p.vcs || '-',
            sandboxes: p.sandboxes?.length || 0,
            updated: p.time?.updated ? new Date(p.time.updated).toLocaleString() : '-',
          }));

          console.log(chalk.bold(`\nProject List (${projects.length}):\n`));
          formatTable(
            mappedProjects as unknown as Record<string, unknown>[],
            ['id', 'worktree', 'vcs', 'sandboxes', 'updated'],
            ['ID', 'Worktree', 'VCS', 'Sandboxes', 'Updated At']
          );
        }
      },
      { showSpinner: true, spinnerMessage: 'Loading projects...' }
    )
  );
