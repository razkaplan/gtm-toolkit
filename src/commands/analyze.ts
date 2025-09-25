// Analyze command implementation
import chalk from 'chalk';
import ora from 'ora';
import { ClaudeContentOptimizer } from '../ai/claude-integration';
import { KeywordsResearchTool } from '../core/keywords-research';
import { writeFileSync } from 'fs';

export async function analyzeCommand(options: any) {
  console.log(chalk.cyan('🔍 GTM Toolkit Analyzer'));

  try {
    // Competitor analysis
    if (options.competitor) {
      const spinner = ora(`Analyzing competitor: ${options.competitor}...`).start();
      
      const claudeApiKey = process.env.CLAUDE_API_KEY;
      if (!claudeApiKey) {
        spinner.warn('Claude API key not found. Set CLAUDE_API_KEY environment variable.');
        return;
      }

      const optimizer = new ClaudeContentOptimizer({ apiKey: claudeApiKey });
      const analysis = await optimizer.analyzeCompetitor(options.competitor);
      
      const output = JSON.stringify(analysis, null, 2);
      if (options.output) {
        writeFileSync(options.output, output);
        spinner.succeed(`Competitor analysis saved to ${options.output}`);
      } else {
        spinner.succeed('Competitor analysis complete');
        console.log(output);
      }
    }

    // Content gaps analysis
    if (options.gaps) {
      const spinner = ora('Analyzing content gaps...').start();
      
      const claudeApiKey = process.env.CLAUDE_API_KEY;
      if (!claudeApiKey) {
        spinner.warn('Claude API key not found. Set CLAUDE_API_KEY environment variable.');
        return;
      }

      // This would typically read from existing content and competitor data
      const optimizer = new ClaudeContentOptimizer({ apiKey: claudeApiKey });
      // Mock data for now
      const gaps = await optimizer.findContentGaps([], []);
      
      const output = JSON.stringify(gaps, null, 2);
      spinner.succeed('Content gaps analysis complete');
      console.log(output);
    }

    // Keywords research
    if (options.keywords) {
      const spinner = ora('Researching keywords...').start();
      
      const keywordsConfig = {
        siteUrl: 'https://example.com',
        claudeApiKey: process.env.CLAUDE_API_KEY
      };
      
      const keywordsTool = new KeywordsResearchTool(keywordsConfig);
      const keywords = await keywordsTool.researchKeywordsWithAI(
        options.keywords,
        'developers and marketers'
      );
      
      spinner.succeed('Keywords research complete');
      console.log(JSON.stringify(keywords, null, 2));
    }

  } catch (error) {
    console.error(chalk.red('❌ Analysis failed:'), error);
  }
}
