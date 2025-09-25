// Audit command implementation
import chalk from 'chalk';
import ora from 'ora';
import { SEO_RULES } from '../core/seo-rules';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

export async function auditCommand(options: any) {
  console.log(chalk.cyan('🕵️ GTM Toolkit Auditor'));

  try {
    // Content SEO audit
    if (options.content || options.all) {
      const spinner = ora('Auditing content SEO...').start();
      
      let totalFiles = 0;
      let totalIssues = 0;
      let totalScore = 0;

      const contentPath = 'content';
      if (existsSync(contentPath)) {
        const auditResults = await auditContentDirectory(contentPath);
        totalFiles = auditResults.fileCount;
        totalIssues = auditResults.issueCount;
        totalScore = auditResults.averageScore;
      }

      spinner.succeed(`Content audit complete: ${totalFiles} files, ${totalIssues} issues, ${totalScore.toFixed(1)}% average score`);
    }

    // Technical SEO audit
    if (options.technical || options.all) {
      const spinner = ora('Auditing technical SEO...').start();
      
      const technicalIssues = [];
      
      // Check for robots.txt
      if (!existsSync('public/robots.txt')) {
        technicalIssues.push('Missing robots.txt file');
      }
      
      // Check for sitemap.xml
      if (!existsSync('public/sitemap.xml')) {
        technicalIssues.push('Missing sitemap.xml file');
      }
      
      if (technicalIssues.length === 0) {
        spinner.succeed('Technical SEO audit complete: No issues found');
      } else {
        spinner.warn(`Technical SEO audit complete: ${technicalIssues.length} issues found`);
        technicalIssues.forEach(issue => {
          console.log(chalk.yellow(`  ⚠️  ${issue}`));
        });
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ Audit failed:'), error);
  }
}

async function auditContentDirectory(dirPath: string): Promise<{
  fileCount: number;
  issueCount: number;
  averageScore: number;
}> {
  let fileCount = 0;
  let totalIssues = 0;
  let totalScore = 0;

  function processDirectory(path: string) {
    const items = readdirSync(path, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = join(path, item.name);
      
      if (item.isDirectory()) {
        processDirectory(itemPath);
      } else if (item.name.endsWith('.md') || item.name.endsWith('.mdx')) {
        fileCount++;
        const result = auditFile(itemPath);
        totalIssues += result.issues;
        totalScore += result.score;
      }
    }
  }

  processDirectory(dirPath);

  return {
    fileCount,
    issueCount: totalIssues,
    averageScore: fileCount > 0 ? totalScore / fileCount : 0
  };
}

function auditFile(filePath: string): { issues: number; score: number } {
  try {
    const content = readFileSync(filePath, 'utf8');
    const { data: frontmatter, content: body } = matter(content);
    
    let issues = 0;
    let passedRules = 0;
    
    SEO_RULES.forEach(rule => {
      const result = rule.check(content, frontmatter, basename(filePath));
      if (!result.passed) {
        issues++;
      } else {
        passedRules++;
      }
    });
    
    const score = (passedRules / SEO_RULES.length) * 100;
    return { issues, score };
  } catch (error) {
    return { issues: 1, score: 0 };
  }
}
