import ora from 'ora';
import { getApi, getOptions } from '../api/client.js';
import { formatError, formatSuccess } from '../output/format.js';
import { Command } from 'commander';

export interface CommandWrapperOptions {
    spinnerMessage?: string;
    showSpinner?: boolean;
    successMessage?: string;
}

// 获取在 action 中注入的原始选项和 command 对象
export function withCommandHandler<T>(
    action: (api: ReturnType<typeof getApi>, options: any, command: Command) => Promise<T>,
    opts: CommandWrapperOptions = {}
) {
    return async (...args: any[]) => {
        // Commander passes options as the second to last argument, and the Command object as the last.
        const command: Command = args[args.length - 1];
        const options: any = args[args.length - 2] || {};

        const showSpinner = opts.showSpinner ?? true;
        const spinner = showSpinner && opts.spinnerMessage
            ? ora(opts.spinnerMessage).start()
            : null;

        try {
            const api = getApi();
            const result = await action(api, options, command);

            spinner?.stop();
            if (opts.successMessage) {
                formatSuccess(opts.successMessage);
            }
            return result;
        } catch (error: any) {
            spinner?.stop();

            let code = 'UNKNOWN_ERROR';
            let suggestion = 'Please check the server status, network connection, or your arguments. Run with --help for usage.';

            if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
                code = 'NETWORK_ERROR';
                suggestion = 'Ensure the OpenCode server is running and accessible. Use --server <url> to specify a custom endpoint.';
            } else if (error.status === 404) {
                code = 'NOT_FOUND';
                suggestion = 'The requested resource could not be found. Check if the ID or path is correct.';
            } else if (error.status === 401 || error.status === 403) {
                code = 'PERMISSION_DENIED';
                suggestion = 'You do not have permission to access the requested resource or perform this action.';
            } else if (error.status === 400 || error.message?.includes('validation') || error.message?.toLowerCase().includes('invalid')) {
                code = 'INVALID_ARGUMENT';
                suggestion = 'One or more of the arguments provided are invalid. Refer to the help output below.';
            }

            formatError({
                code: error.code || code,
                message: error.message || 'An unexpected error occurred during execution',
                suggestion: error.suggestion || suggestion,
            }, command);

            process.exit(1);
        }
    };
}

export function helpTextBuilder(config: {
    sourceFormat?: string;
    examples?: string[];
    options?: string[];
    notes?: string[];
    workflow?: string[];
}): string {
    let help = '\n';

    if (config.sourceFormat) {
        help += `SOURCE FORMAT:\n  ${config.sourceFormat}\n\n`;
    }

    if (config.examples && config.examples.length > 0) {
        help += 'EXAMPLES:\n';
        config.examples.forEach(ex => {
            help += `  $ ${ex}\n`;
        });
        help += '\n';
    }

    if (config.options && config.options.length > 0) {
        help += 'OPTIONS:\n';
        config.options.forEach(opt => {
            help += `  ${opt}\n`;
        });
        help += '\n';
    }

    if (config.notes && config.notes.length > 0) {
        help += 'NOTES:\n';
        config.notes.forEach(note => {
            help += `  - ${note}\n`;
        });
        help += '\n';
    }

    if (config.workflow && config.workflow.length > 0) {
        help += 'WORKFLOW:\n';
        config.workflow.forEach((step, i) => {
            help += `  ${i + 1}. ${step}\n`;
        });
        help += '\n';
    }

    return help.trimEnd() + '\n';
}
