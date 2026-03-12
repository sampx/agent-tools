import Table from 'cli-table3';
import chalk from 'chalk';
import { Command } from 'commander';

export type OutputFormat = 'table' | 'json';

export function formatOutput(
  data: unknown,
  format: OutputFormat = 'table'
): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(data);
}

export function formatTable<T extends Record<string, unknown>>(
  data: T[],
  columns: (keyof T)[],
  headers?: string[]
): void {
  if (data.length === 0) {
    console.log(chalk.gray('No data found'));
    return;
  }

  const table = new Table({
    head: headers ?? columns.map((c) => String(c)),
    style: { head: ['cyan'] },
  });

  data.forEach((item) => {
    table.push(
      columns.map((col) => {
        const value = item[col];
        return formatValue(value);
      })
    );
  });

  console.log(table.toString());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return chalk.gray('-');
  if (typeof value === 'boolean') return value ? chalk.green('true') : chalk.red('false');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatList<T>(items: T[], label: string): void {
  console.log(chalk.bold(`${label} (${items.length}):`));
  items.forEach((item, index) => {
    console.log(`  ${chalk.gray(`${index + 1}.`)} ${formatValue(item)}`);
  });
}

export interface StandardError {
  code: string;
  message: string;
  suggestion?: string;
  details?: unknown;
}

export function formatError(err: StandardError | string, command?: Command): void {
  const code = typeof err === 'string' ? 'ERROR' : err.code;
  const message = typeof err === 'string' ? err : err.message;
  const suggestion = typeof err === 'string' ? undefined : err.suggestion;

  console.error(chalk.red(`✗ [${code}] ${message}`));

  if (suggestion) {
    console.error(chalk.yellow(`  Suggestion: ${suggestion}\n`));
  }

  if (typeof err !== 'string' && err.details) {
    console.error(chalk.gray(JSON.stringify(err.details, null, 2)));
  }

  if (command) {
    console.log('');
    command.help();
  }
}

export function formatSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function formatWarning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

export function formatInfo(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}