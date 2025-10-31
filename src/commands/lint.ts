import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { globSync } from 'glob';
import { lintContent, summarizeLintResults } from '../core/seo-rules';
import { loadContentFiles } from '../utils/content-loader';

export function createLintCommand(): Command {
  const cmd = new Command('lint');

  cmd
    .description('Lint markdown content for GTM SEO guard rails')
    .argument('[paths...]', 'Files or directories to lint', ['content'])
    .option('-f, --format <type>', 'output format (console, json)', 'console')
    .option('--fail-on-error', 'Set non-zero exit code when errors are found')
    .action(async (paths: string[], options) => {
      const spinner = ora('Loading content...').start();

      try {
        const targets = paths.length > 0 ? paths : ['content'];
        const files = [];

        for (const target of targets) {
          const expandedTargets = /[*?]/.test(target) ? globSync(target) : [target];

          for (const expandedTarget of expandedTargets) {
            try {
              const contentFiles = await loadContentFiles(expandedTarget, { recursive: true });
              files.push(...contentFiles);
            } catch (error) {
              spinner.warn(`Failed to load ${expandedTarget}: ${(error as Error).message}`);
            }
          }
        }

        if (files.length === 0) {
          spinner.fail('No content files found to lint');
          process.exitCode = 1;
          return;
        }

        spinner.succeed(`Linting ${files.length} content files...`);

        const lintResults = files.map(file => {
          const results = lintContent(file.content, {
            filePath: file.path,
            frontmatter: file.frontmatter
          });
          const { summary, score } = summarizeLintResults(results);
          return {
            file: file.path,
            results,
            summary,
            score
          };
        });

        if (options.format === 'json') {
          const report = lintResults.map(entry => ({
            file: entry.file,
            summary: entry.summary,
            score: entry.score,
            findings: entry.results
          }));
          console.log(JSON.stringify(report, null, 2));
        } else {
          lintResults.forEach(entry => {
            const relativePath = path.relative(process.cwd(), entry.file) || entry.file;
            const heading = entry.summary.errors > 0
              ? chalk.red.bold('✖')
              : entry.summary.warnings > 0
                ? chalk.yellow.bold('⚠')
                : chalk.green.bold('✓');

            console.log(`\n${heading} ${chalk.bold(relativePath)} (${entry.score.toFixed(1)}%)`);
            console.log(
              chalk.gray(
                `   errors: ${entry.summary.errors} | warnings: ${entry.summary.warnings} | passed: ${entry.summary.passed}`
              )
            );

            entry.results
              .filter(result => !result.passed)
              .forEach(result => {
                const label = result.severity === 'error' ? chalk.red('error') : chalk.yellow('warning');
                console.log(`   - [${label}] ${result.rule}: ${result.message}`);
                if (result.suggestion) {
                  console.log(chalk.gray(`     suggestion: ${result.suggestion}`));
                }
              });
          });
        }

        const totalErrors = lintResults.reduce((acc, entry) => acc + entry.summary.errors, 0);
        if (options.failOnError && totalErrors > 0) {
          process.exitCode = 1;
        }
      } catch (error) {
        spinner.fail('Failed to lint content');
        console.error(chalk.red((error as Error).message));
        process.exitCode = 1;
      }
    });

  return cmd;
}
