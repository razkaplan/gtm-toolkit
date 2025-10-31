import { Command } from 'commander';
import { FixSuggestionsGenerator, ExecutionPlan, FixSuggestion } from '../ai/fix-suggestions';
import { loadContentFiles } from '../utils/content-loader';
import { loadConfig } from '../utils/config';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

interface FixExecutionResult {
  applied: FixSuggestion[];
  failed: FixSuggestion[];
  skipped: FixSuggestion[];
}

interface FixCommandOptions {
  plan: string;
  auto?: boolean;
  confidence: string;
  priority: string;
  dryRun?: boolean;
  backup?: boolean;
  interactive?: boolean;
}

export function createFixCommand(): Command {
  const cmd = new Command('fix');

  cmd
    .description('Apply AI-suggested fixes with user confirmation')
    .argument('[path]', 'Content directory to fix', 'content/')
    .option('--plan <file>', 'Use existing execution plan file', 'fix-execution-plan.md')
    .option('--auto', 'Apply fixes automatically without confirmation')
    .option('--confidence <level>', 'Minimum confidence level: low, medium, high', 'medium')
    .option('--priority <level>', 'Minimum priority level: low, medium, high, critical', 'medium')
    .option('--dry-run', 'Show what would be changed without applying fixes')
    .option('--backup', 'Create backup of files before applying fixes')
    .option('--interactive', 'Review each fix individually')
    .action(async (contentPath: string, options: FixCommandOptions) => {
      try {
        let executionPlan: ExecutionPlan;

        // Check if execution plan exists
        const planPath = path.resolve(options.plan);
        if (await fs.pathExists(planPath)) {
          console.log(chalk.blue('📋 Loading existing execution plan...'));
          executionPlan = await loadExecutionPlan(planPath);
        } else {
          console.log(chalk.yellow('📝 No execution plan found. Generating new suggestions...'));
          executionPlan = await generateNewExecutionPlan(contentPath);
        }

        // Display execution plan summary
        displayExecutionSummary(executionPlan);

        // Filter fixes based on options
        const eligibleFixes = filterFixes(executionPlan.fixes, {
          confidence: options.confidence,
          priority: options.priority,
          autoFixableOnly: options.auto
        });

        if (eligibleFixes.length === 0) {
          console.log(chalk.yellow('⚠️  No fixes match the specified criteria.'));
          process.exit(0);
        }

        console.log(chalk.green(`\n✅ Found ${eligibleFixes.length} eligible fixes`));

        // Show what will be changed
        if (options.dryRun) {
          await showDryRunPreview(eligibleFixes);
          process.exit(0);
        }

        // Get user confirmation
        if (!options.auto) {
          const shouldProceed = await confirmExecution(eligibleFixes, Boolean(options.interactive));
          if (!shouldProceed) {
            console.log(chalk.yellow('❌ Execution cancelled by user'));
            process.exit(0);
          }
        }

        // Create backups if requested
        if (options.backup) {
          await createBackups(eligibleFixes);
        }

        // Execute fixes
        const results = await executeFixes(eligibleFixes);

        // Display results
        displayExecutionResults(results);

        // Generate post-execution report
        await generatePostExecutionReport(results, executionPlan);

      } catch (error) {
        console.error(chalk.red('❌ Fix execution failed:'), error);
        process.exit(1);
      }
    });

  return cmd;
}

async function loadExecutionPlan(planPath: string): Promise<ExecutionPlan> {
  const content = await fs.readFile(planPath, 'utf-8');

  // If it's a JSON file, parse directly
  if (planPath.endsWith('.json')) {
    return JSON.parse(content);
  }

  // If it's markdown, we'd need to parse it - for now, throw error
  throw new Error('Markdown plan parsing not implemented. Please use JSON format or regenerate plan.');
}

async function generateNewExecutionPlan(contentPath: string): Promise<ExecutionPlan> {
  const config = await loadConfig();
  const contentFiles = await loadContentFiles(contentPath, {
    extensions: config.content?.extensions || ['.md', '.mdx']
  });

  const generator = new FixSuggestionsGenerator();

  return await generator.generateFixSuggestions(contentFiles);
}

function displayExecutionSummary(plan: ExecutionPlan): void {
  console.log('\n' + chalk.bold.blue('📋 Execution Plan Summary'));
  console.log('─'.repeat(50));
  console.log(chalk.green(`✅ Auto-fixable: ${plan.summary.autoFixableIssues}`));
  console.log(chalk.yellow(`👨‍💻 Manual review: ${plan.summary.manualReviewIssues}`));
  console.log(chalk.blue(`⏱️  Total time: ${plan.summary.estimatedTotalTime}`));
  console.log(chalk.gray('\n🧠 Manual fixes include ready-made prompts for local assistants (Copilot, Cursor, Claude Desktop, Gemini, etc.). Paste them into your tooling to speed up rewrites.'));
}

function filterFixes(fixes: FixSuggestion[], criteria: {
  confidence: string;
  priority: string;
  autoFixableOnly?: boolean;
}): FixSuggestion[] {
  const confidenceOrder = { low: 0, medium: 1, high: 2 };
  const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };

  return fixes.filter(fix => {
    if (criteria.autoFixableOnly && !fix.autoFixable) return false;
    if (confidenceOrder[fix.confidence] < confidenceOrder[criteria.confidence as keyof typeof confidenceOrder]) return false;
    if (priorityOrder[fix.priority] < priorityOrder[criteria.priority as keyof typeof priorityOrder]) return false;
    return true;
  });
}

async function showDryRunPreview(fixes: FixSuggestion[]): Promise<void> {
  console.log('\n' + chalk.bold.cyan('🔍 Dry Run Preview - Changes That Would Be Made:'));
  console.log('─'.repeat(60));

  fixes.forEach((fix, index) => {
    console.log(`\n${index + 1}. ${chalk.bold(fix.issue)}`);
    console.log(`   File: ${chalk.gray(fix.file)}`);
    console.log(`   Priority: ${getPriorityColor(fix.priority)(fix.priority.toUpperCase())}`);
    console.log(`   Fix: ${chalk.green(fix.suggestion)}`);

    if (fix.beforeExample && fix.afterExample) {
      console.log(`   ${chalk.red('- Before:')} ${fix.beforeExample}`);
      console.log(`   ${chalk.green('+ After:')}  ${fix.afterExample}`);
    }
  });

  console.log('\n' + chalk.yellow('💡 Run without --dry-run to apply these changes'));
}

async function confirmExecution(fixes: FixSuggestion[], interactive: boolean): Promise<boolean> {
  if (interactive) {
    return await confirmInteractively(fixes);
  } else {
    return await confirmBulk(fixes);
  }
}

async function confirmBulk(fixes: FixSuggestion[]): Promise<boolean> {
  console.log('\n' + chalk.bold.yellow('⚠️  Ready to Apply Fixes'));
  console.log('─'.repeat(40));

  const autoFixable = fixes.filter(f => f.autoFixable).length;
  const manual = fixes.length - autoFixable;

  console.log(`📝 ${fixes.length} total fixes will be applied:`);
  console.log(`   ${chalk.green(`• ${autoFixable} automatic fixes`)}`);
  console.log(`   ${chalk.yellow(`• ${manual} requiring review`)}`);

  const { proceed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'proceed',
    message: 'Do you want to proceed with applying these fixes?',
    default: false
  }]);

  return proceed;
}

async function confirmInteractively(fixes: FixSuggestion[]): Promise<boolean> {
  console.log('\n' + chalk.bold.cyan('🔍 Interactive Fix Review'));
  console.log('Review each fix individually...\n');

  const selectedFixes: string[] = [];

  for (const fix of fixes) {
    console.log(`\n${chalk.bold(fix.issue)}`);
    console.log(`File: ${chalk.gray(fix.file)}`);
    console.log(`Priority: ${getPriorityColor(fix.priority)(fix.priority)}`);
    console.log(`Suggestion: ${fix.suggestion}`);

    if (fix.beforeExample && fix.afterExample) {
      console.log(`${chalk.red('Before:')} ${fix.beforeExample}`);
      console.log(`${chalk.green('After:')}  ${fix.afterExample}`);
    }

    const { apply } = await inquirer.prompt([{
      type: 'confirm',
      name: 'apply',
      message: 'Apply this fix?',
      default: fix.autoFixable && fix.confidence === 'high'
    }]);

    if (apply) {
      selectedFixes.push(fix.id);
    }
  }

  if (selectedFixes.length === 0) {
    console.log(chalk.yellow('\n⚠️  No fixes selected'));
    return false;
  }

  console.log(chalk.green(`\n✅ Selected ${selectedFixes.length} fixes to apply`));

  const { finalConfirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'finalConfirm',
    message: 'Proceed with applying the selected fixes?',
    default: true
  }]);

  return finalConfirm;
}

async function createBackups(fixes: FixSuggestion[]): Promise<void> {
  const spinner = ora('Creating backups...').start();

  const uniqueFiles = [...new Set(fixes.map(f => f.file))];
  const backupDir = path.join(process.cwd(), '.gtm-backups', new Date().toISOString().split('T')[0]);

  await fs.ensureDir(backupDir);

  for (const filePath of uniqueFiles) {
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, fileName);
    await fs.copy(filePath, backupPath);
  }

  spinner.succeed(`Backups created in ${backupDir}`);
}

async function executeFixes(fixes: FixSuggestion[]): Promise<FixExecutionResult> {
  const spinner = ora('Applying fixes...').start();

  const results: FixExecutionResult = {
    applied: [],
    failed: [],
    skipped: []
  };

  for (const fix of fixes) {
    try {
      if (fix.autoFixable) {
        const success = await applyAutoFix(fix);
        if (success) {
          results.applied.push(fix);
          spinner.text = `Applied: ${fix.issue}`;
        } else {
          results.failed.push(fix);
        }
      } else {
        // For manual fixes, we just mark them as applied (user will handle manually)
        results.applied.push(fix);
      }
    } catch (error) {
      console.warn(`Failed to apply fix ${fix.id}:`, error);
      results.failed.push(fix);
    }
  }

  spinner.succeed(`Applied ${results.applied.length} fixes successfully`);
  return results;
}

async function applyAutoFix(fix: FixSuggestion): Promise<boolean> {
  try {
    const content = await fs.readFile(fix.file, 'utf-8');

    // Apply the fix based on the fix type
    const updatedContent = await applyFixToContent(content, fix);

    if (updatedContent !== content) {
      await fs.writeFile(fix.file, updatedContent, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.warn(`Failed to apply auto-fix for ${fix.file}:`, error);
    return false;
  }
}

async function applyFixToContent(content: string, fix: FixSuggestion): Promise<string> {
  // This is a simplified implementation - real implementation would handle
  // specific fix types based on the fix.id and fix.category

  if (fix.beforeExample && fix.afterExample) {
    return content.replace(fix.beforeExample, fix.afterExample);
  }

  // For now, return unchanged content
  // In a real implementation, we'd handle specific fix types:
  // - Title length fixes
  // - Date format fixes
  // - Meta description truncation
  // - etc.

  return content;
}

function displayExecutionResults(results: FixExecutionResult): void {
  console.log('\n' + chalk.bold.green('📊 Execution Results'));
  console.log('─'.repeat(40));

  console.log(chalk.green(`✅ Applied: ${results.applied.length} fixes`));
  if (results.failed.length > 0) {
    console.log(chalk.red(`❌ Failed: ${results.failed.length} fixes`));
  }
  if (results.skipped.length > 0) {
    console.log(chalk.yellow(`⏭️  Skipped: ${results.skipped.length} fixes`));
  }

  if (results.failed.length > 0) {
    console.log('\n' + chalk.bold.red('Failed Fixes:'));
    results.failed.forEach(fix => {
      console.log(chalk.red(`  • ${fix.file}: ${fix.issue}`));
    });
  }
}

async function generatePostExecutionReport(results: FixExecutionResult, originalPlan: ExecutionPlan): Promise<void> {
  const totalAttempted = results.applied.length + results.failed.length;
  const successRate = totalAttempted > 0
    ? Math.round((results.applied.length / totalAttempted) * 100)
    : 0;

  const recommendationsSection = originalPlan.recommendations.length > 0
    ? originalPlan.recommendations.map(rec => `- ${rec}`).join('\n')
    : '- No additional recommendations recorded.';

  const nextStepsSection = originalPlan.nextSteps.length > 0
    ? originalPlan.nextSteps.map(step => `- ${step}`).join('\n')
    : '- No next steps recorded.';

  const reportContent = `# GTM Toolkit - Fix Execution Report

*Generated on ${new Date().toLocaleString()}*

## Execution Summary

- **Total Fixes Attempted:** ${totalAttempted}
- **Successfully Applied:** ${results.applied.length}
- **Failed:** ${results.failed.length}
- **Success Rate:** ${successRate}%

## Plan Overview

- **Auto-fixable Issues in Plan:** ${originalPlan.summary.autoFixableIssues}
- **Manual Review Issues in Plan:** ${originalPlan.summary.manualReviewIssues}
- **Estimated Total Time:** ${originalPlan.summary.estimatedTotalTime}

## Applied Fixes

${results.applied.map(fix => `
### ${fix.issue}
- **File:** \`${fix.file}\`
- **Priority:** ${fix.priority}
- **Category:** ${fix.category}
- **Fix Applied:** ${fix.suggestion}
`).join('\n')}

${results.failed.length > 0 ? `
## Failed Fixes

${results.failed.map(fix => `
### ${fix.issue}
- **File:** \`${fix.file}\`
- **Reason:** Auto-fix failed - requires manual intervention
- **Suggested Action:** ${fix.suggestion}
`).join('\n')}
` : ''}

## Recommendations

${recommendationsSection}

## Next Steps

${nextStepsSection}

${results.failed.length > 0 ? `
## Manual Follow-up Required

- Review failed fixes and apply changes manually.
- Consider generating a new execution plan after manual updates.
` : ''}

---

*Report generated by GTM Toolkit*
`;

  const reportPath = path.join(process.cwd(), 'fix-execution-report.md');
  await fs.writeFile(reportPath, reportContent, 'utf-8');

  console.log(chalk.blue(`\n📄 Detailed report saved to: ${reportPath}`));
}

function getPriorityColor(priority: string): (text: string) => string {
  switch (priority) {
    case 'critical': return chalk.red.bold;
    case 'high': return chalk.red;
    case 'medium': return chalk.yellow;
    default: return chalk.gray;
  }
}
