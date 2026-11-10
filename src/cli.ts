#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import {
  UsageError,
  buildCommand,
  checkCommand,
  coverageCommand,
  diffCommand,
  explainCommand,
  initCommand,
  lintCommand,
  rulesCommand,
  validateCommand,
} from './commands';
import { reference } from './reference';
import { VERSION } from './version';

// `gtm rules | head` closes the pipe early. That is not an error.
process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

const program = new Command();

program
  .name('gtm')
  .description('Go-to-market as code: declare it, check it, compile it.')
  .version(VERSION, '-v, --version')
  .option('-C, --cwd <dir>', 'run as if started in this directory')
  .option('--dir <dir>', 'spec directory, relative to the project root', 'gtm')
  .showHelpAfterError('(run with --help for usage)');

/** Run a command, turn its return value into the exit code, and keep stack traces away from users. */
function run(action: (...args: never[]) => number): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    try {
      process.exitCode = (action as (...inner: unknown[]) => number)(...args);
    } catch (error) {
      if (error instanceof UsageError) {
        process.stderr.write(`${pc.red('error')} ${error.message}\n`);
        process.exitCode = 2;
        return;
      }
      throw error;
    }
  };
}

const globals = (command: Command): Record<string, unknown> => command.optsWithGlobals();

program
  .command('init')
  .description('Scaffold a gtm/ spec in this project. Never overwrites a file.')
  .option('--name <name>', 'site or product name')
  .option('--url <url>', 'canonical site origin, for example https://www.example.dev')
  .option('--description <text>', 'one or two sentences on what this is')
  .option('--minimal', 'write gtm.yaml only, without the strategy files')
  .action(run((_options: unknown, command: Command) => initCommand(globals(command))));

program
  .command('validate')
  .description('Check the spec: schema, references between files, claims without proof.')
  .option('-f, --format <format>', 'stylish, json or github', 'stylish')
  .action(run((_options: unknown, command: Command) => validateCommand(globals(command))));

program
  .command('lint')
  .description('Check content against the spec: SEO structure, vocabulary, references, links.')
  .argument('[paths...]', 'files or folders to report on (default: every collection)')
  .option('-f, --format <format>', 'stylish, json or github', 'stylish')
  .option('--changed [base]', 'only files changed against a git ref (default: origin/HEAD) or not yet committed')
  .option('--max-warnings <n>', 'exit 1 when there are more warnings than this')
  .option('--quiet', 'report errors only')
  .action(run((paths: string[], _options: unknown, command: Command) => lintCommand(paths, globals(command))));

program
  .command('build')
  .description('Compile the spec and content into robots.txt, sitemap.xml, llms.txt, GTM.md and JSON-LD.')
  .option('--check', 'write nothing; exit 1 if a generated file is missing or stale')
  .option('--dry-run', 'show what would change without writing')
  .option('-f, --format <format>', 'stylish, json or github', 'stylish')
  .action(run((_options: unknown, command: Command) => buildCommand(globals(command))));

program
  .command('check')
  .description('validate + lint + build --check in one pass. The command to run in CI.')
  .option('-f, --format <format>', 'stylish, json or github', 'stylish')
  .option('--max-warnings <n>', 'exit 1 when there are more warnings than this')
  .option('--quiet', 'report errors only')
  .action(run((_options: unknown, command: Command) => checkCommand(globals(command))));

program
  .command('coverage')
  .description('Strategy against execution: published content per persona, topic, pillar and question.')
  .option('-f, --format <format>', 'stylish, json or md', 'stylish')
  .action(run((_options: unknown, command: Command) => coverageCommand(globals(command))));

program
  .command('diff')
  .description('What changed in the strategy since a git ref, and which content it strands.')
  .argument('[base]', 'git ref to compare the working tree against', 'HEAD')
  .option('-f, --format <format>', 'stylish, json or md', 'stylish')
  .action(run((base: string, _options: unknown, command: Command) => diffCommand(base, globals(command))));

program
  .command('rules')
  .description('List the content rules and their current severity.')
  .option('-f, --format <format>', 'stylish or json', 'stylish')
  .action(run((_options: unknown, command: Command) => rulesCommand(globals(command))));

program
  .command('explain')
  .description('Say what a rule checks and why it exists.')
  .argument('<rule>', 'rule id, for example seo/internal-links')
  .action(run((id: string) => explainCommand(id)));

program
  .command('reference', { hidden: true })
  .description('Print the CLI, rule and schema reference as JSON. The docs are generated from this.')
  .action(() => {
    process.stdout.write(`${JSON.stringify(reference(program), null, 2)}\n`);
  });

program.parse();
