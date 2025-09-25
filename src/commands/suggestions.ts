import { Command } from 'commander';
import { FixSuggestionsGenerator, ExecutionPlan } from '../ai/fix-suggestions';
import { loadContentFiles } from '../utils/content-loader';
import { loadConfig } from '../utils/config';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

export function createSuggestionsCommand(): Command {
  const cmd = new Command('suggestions');

  cmd
    .description('Generate Claude AI-powered fix suggestions and execution plan')
    .argument('[path]', 'Content directory to analyze', 'content/')
    .option('-o, --output <file>', 'Output file for execution plan', 'fix-execution-plan.md')
    .option('--no-ai', 'Disable Claude AI suggestions (use SEO linting only)')
    .option('--max-per-file <number>', 'Maximum suggestions per file', '10')
    .option('--focus <areas>', 'Focus areas (comma-separated): seo,content,structure,technical', 'seo,content,structure')
    .option('--format <type>', 'Output format: markdown, json', 'markdown')
    .option('--preview', 'Preview suggestions without saving to file')
    .action(async (contentPath: string, options) => {
      const config = await loadConfig();
      const spinner = ora('Analyzing content and generating fix suggestions...').start();

      try {
        // Load content files
        const resolvedPath = path.resolve(contentPath);
        if (!await fs.pathExists(resolvedPath)) {
          spinner.fail(`Content path does not exist: ${resolvedPath}`);
          process.exit(1);
        }

        const contentFiles = await loadContentFiles(resolvedPath, {
          extensions: config.content?.extensions || ['.md', '.mdx']
        });

        if (contentFiles.length === 0) {
          spinner.fail('No content files found');
          process.exit(1);
        }

        spinner.text = `Found ${contentFiles.length} content files. Generating suggestions...`;

        // Initialize fix suggestions generator
        const suggestionsGenerator = new FixSuggestionsGenerator({
          apiKey: config.ai?.apiKey || process.env.CLAUDE_API_KEY,
          model: config.ai?.model
        });

        // Generate fix suggestions
        const focusAreas = options.focus ? options.focus.split(',').map((a: string) => a.trim()) : ['seo', 'content', 'structure'];
        const executionPlan = await suggestionsGenerator.generateFixSuggestions(contentFiles, {
          includeAISuggestions: options.ai !== false,
          maxSuggestionsPerFile: parseInt(options.maxPerFile),
          focusAreas
        });

        spinner.succeed(`Generated execution plan with ${executionPlan.summary.totalIssues} optimization opportunities`);

        // Display summary
        displayExecutionSummary(executionPlan);

        // Save or preview results
        if (options.preview) {
          console.log('\n' + chalk.yellow('📋 Preview Mode - No files saved'));
          if (options.format === 'json') {
            console.log(JSON.stringify(executionPlan, null, 2));
          } else {
            const generator = new FixSuggestionsGenerator();
            const markdown = (generator as any).formatExecutionPlanAsMarkdown(executionPlan);
            console.log(markdown);
          }
        } else {
          const outputPath = path.resolve(options.output);

          if (options.format === 'json') {
            await fs.writeJSON(outputPath.replace('.md', '.json'), executionPlan, { spaces: 2 });
            console.log(chalk.green(`\n✅ Execution plan saved to: ${outputPath.replace('.md', '.json')}`));
          } else {
            await suggestionsGenerator.generateMarkdownReport(executionPlan, outputPath);
            console.log(chalk.green(`\n✅ Execution plan saved to: ${outputPath}`));
          }

          // Show next steps
          displayNextSteps(executionPlan);
        }

      } catch (error) {
        spinner.fail('Failed to generate fix suggestions');
        console.error(chalk.red('Error:'), error);
        process.exit(1);
      }
    });

  return cmd;
}

function displayExecutionSummary(plan: ExecutionPlan): void {
  const { summary } = plan;

  console.log('\n' + chalk.bold.blue('📊 Execution Plan Summary'));
  console.log('─'.repeat(50));

  console.log(chalk.green(`✅ Auto-fixable issues: ${summary.autoFixableIssues}`));
  console.log(chalk.yellow(`👨‍💻 Manual review required: ${summary.manualReviewIssues}`));
  console.log(chalk.blue(`⏱️  Estimated total time: ${summary.estimatedTotalTime}`));

  console.log('\n' + chalk.bold('Priority Breakdown:'));
  Object.entries(summary.priorityBreakdown).forEach(([priority, count]) => {
    const color = priority === 'critical' ? 'red' : priority === 'high' ? 'yellow' : 'gray';
    console.log(chalk[color](`  ${priority}: ${count} issues`));
  });

  // Show top 3 most common issues
  const issueTypes = plan.fixes.reduce((acc, fix) => {
    acc[fix.category] = (acc[fix.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIssues = Object.entries(issueTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  if (topIssues.length > 0) {
    console.log('\n' + chalk.bold('Top Issue Categories:'));
    topIssues.forEach(([category, count]) => {
      console.log(chalk.gray(`  ${category}: ${count} issues`));
    });
  }
}

function displayNextSteps(plan: ExecutionPlan): void {
  console.log('\n' + chalk.bold.cyan('🚀 Recommended Next Steps:'));
  console.log('─'.repeat(50));

  plan.nextSteps.forEach((step, i) => {
    console.log(chalk.cyan(`${i + 1}. ${step}`));
  });

  // Show command examples
  if (plan.summary.autoFixableIssues > 0) {
    console.log('\n' + chalk.bold.green('Quick Commands:'));
    console.log(chalk.green('  gtm-toolkit fix --auto --confidence high  # Apply automatic fixes'));
    console.log(chalk.green('  gtm-toolkit audit --compare baseline.json  # Measure improvement'));
  }

  console.log('\n' + chalk.bold.yellow('💡 Pro Tips:'));
  plan.recommendations.forEach(rec => {
    console.log(chalk.yellow(`  • ${rec}`));
  });
}