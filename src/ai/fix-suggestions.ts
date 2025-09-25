import { ClaudeContentOptimizer } from './claude-integration';
import { lintContent, SEOLintResult } from '../core/seo-rules';
import { ContentFile } from '../types';
import fs from 'fs-extra';
import path from 'path';

export interface FixSuggestion {
  id: string;
  file: string;
  issue: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'seo' | 'content' | 'structure' | 'technical';
  suggestion: string;
  autoFixable: boolean;
  confidence: 'high' | 'medium' | 'low';
  impact: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  beforeExample?: string;
  afterExample?: string;
}

export interface ExecutionPlan {
  summary: {
    totalIssues: number;
    autoFixableIssues: number;
    manualReviewIssues: number;
    estimatedTotalTime: string;
    priorityBreakdown: Record<string, number>;
  };
  fixes: FixSuggestion[];
  recommendations: string[];
  nextSteps: string[];
}

export class FixSuggestionsGenerator {
  private claudeOptimizer: ClaudeContentOptimizer;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    this.claudeOptimizer = new ClaudeContentOptimizer({
      apiKey: options.apiKey || process.env.CLAUDE_API_KEY || '',
      model: options.model || 'claude-3-sonnet-20240229'
    });
  }

  async generateFixSuggestions(
    contentFiles: ContentFile[],
    options: {
      includeAISuggestions?: boolean;
      maxSuggestionsPerFile?: number;
      focusAreas?: string[];
    } = {}
  ): Promise<ExecutionPlan> {
    const {
      includeAISuggestions = true,
      maxSuggestionsPerFile = 10,
      focusAreas = ['seo', 'content', 'structure']
    } = options;

    const allFixes: FixSuggestion[] = [];

    // Process each content file
    for (const file of contentFiles) {
      try {
        // Run SEO linting first
        const lintResults = await lintContent(file.content, file.path);

        // Convert lint results to fix suggestions
        const lintFixes = this.convertLintResultsToFixes(file.path, lintResults);
        allFixes.push(...lintFixes);

        // Generate AI-powered suggestions if enabled
        if (includeAISuggestions && this.claudeOptimizer.apiKey) {
          const aiSuggestions = await this.generateAISuggestions(file, focusAreas);
          allFixes.push(...aiSuggestions.slice(0, maxSuggestionsPerFile));
        }
      } catch (error) {
        console.warn(`Error processing file ${file.path}:`, error);
      }
    }

    // Sort and prioritize fixes
    const prioritizedFixes = this.prioritizeFixes(allFixes);

    // Generate execution plan
    const executionPlan = this.createExecutionPlan(prioritizedFixes);

    return executionPlan;
  }

  private convertLintResultsToFixes(filePath: string, lintResults: SEOLintResult[]): FixSuggestion[] {
    return lintResults
      .filter(result => !result.passed)
      .map((result, index) => {
        const isAutoFixable = this.isAutoFixable(result.rule);
        const priority = this.determinePriority(result.rule, result.severity);

        return {
          id: `${result.rule}-${path.basename(filePath)}-${index}`,
          file: filePath,
          issue: result.message,
          priority,
          category: this.determineCategory(result.rule),
          suggestion: this.generateFixSuggestion(result),
          autoFixable: isAutoFixable,
          confidence: isAutoFixable ? 'high' : 'medium',
          impact: this.determineImpact(result.rule),
          difficulty: isAutoFixable ? 'easy' : 'medium',
          estimatedTime: isAutoFixable ? '2-5 min' : '10-30 min',
          beforeExample: this.generateBeforeExample(result),
          afterExample: this.generateAfterExample(result)
        };
      });
  }

  private async generateAISuggestions(
    file: ContentFile,
    focusAreas: string[]
  ): Promise<FixSuggestion[]> {
    try {
      const analysis = await this.claudeOptimizer.analyzeContent(file.content, {
        targetKeywords: this.extractKeywordsFromContent(file.content),
        targetAudience: 'developers and marketers',
        analysisType: 'optimization'
      });

      return analysis.suggestions.map((suggestion, index) => ({
        id: `ai-${path.basename(file.path)}-${index}`,
        file: file.path,
        issue: suggestion.issue,
        priority: this.mapAIPriority(suggestion.priority),
        category: this.mapAICategory(suggestion.type),
        suggestion: suggestion.recommendation,
        autoFixable: suggestion.confidence > 0.8 && this.isSimpleTextChange(suggestion),
        confidence: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
        impact: suggestion.expectedImprovement,
        difficulty: this.estimateDifficulty(suggestion),
        estimatedTime: this.estimateTimeRequired(suggestion),
        beforeExample: suggestion.currentContent,
        afterExample: suggestion.suggestedContent
      }));
    } catch (error) {
      console.warn(`AI analysis failed for ${file.path}:`, error);
      return [];
    }
  }

  private prioritizeFixes(fixes: FixSuggestion[]): FixSuggestion[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

    return fixes.sort((a, b) => {
      // First by priority
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      // Then by auto-fixable (auto-fixable first)
      if (a.autoFixable !== b.autoFixable) {
        return a.autoFixable ? -1 : 1;
      }

      // Then by confidence
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
  }

  private createExecutionPlan(fixes: FixSuggestion[]): ExecutionPlan {
    const autoFixableIssues = fixes.filter(f => f.autoFixable).length;
    const manualReviewIssues = fixes.length - autoFixableIssues;

    const priorityBreakdown = fixes.reduce((acc, fix) => {
      acc[fix.priority] = (acc[fix.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const estimatedTotalMinutes = fixes.reduce((total, fix) => {
      const timeStr = fix.estimatedTime;
      const avgTime = this.parseTimeEstimate(timeStr);
      return total + avgTime;
    }, 0);

    const estimatedTotalTime = this.formatTotalTime(estimatedTotalMinutes);

    const recommendations = this.generateRecommendations(fixes);
    const nextSteps = this.generateNextSteps(fixes, autoFixableIssues, manualReviewIssues);

    return {
      summary: {
        totalIssues: fixes.length,
        autoFixableIssues,
        manualReviewIssues,
        estimatedTotalTime,
        priorityBreakdown
      },
      fixes,
      recommendations,
      nextSteps
    };
  }

  private isAutoFixable(rule: string): boolean {
    // Define which SEO rules can be automatically fixed
    const autoFixableRules = [
      'SEO-001', // Title length - can expand/truncate
      'SEO-004', // Summary length - can truncate
      'SEO-002', // Date format - can reformat
      'SEO-011', // Heading hierarchy - can adjust levels
      'SEO-020'  // Image alt text - can add default descriptions
    ];

    return autoFixableRules.includes(rule);
  }

  private determinePriority(rule: string, severity: 'error' | 'warning' | 'info'): FixSuggestion['priority'] {
    if (severity === 'error') {
      return ['SEO-001', 'SEO-002', 'SEO-004'].includes(rule) ? 'critical' : 'high';
    }
    if (severity === 'warning') {
      return 'medium';
    }
    return 'low';
  }

  private determineCategory(rule: string): FixSuggestion['category'] {
    if (rule.startsWith('SEO-00')) return 'seo';
    if (rule.startsWith('SEO-01')) return 'content';
    if (rule.startsWith('SEO-02')) return 'structure';
    return 'technical';
  }

  private generateFixSuggestion(result: SEOLintResult): string {
    const fixSuggestions: Record<string, string> = {
      'SEO-001': 'Expand the title to be between 45-70 characters and include your primary keyword near the beginning.',
      'SEO-002': 'Update the date to use ISO format (YYYY-MM-DD).',
      'SEO-004': 'Adjust the summary to be between 120-160 characters to optimize for search engine snippets.',
      'SEO-011': 'Fix the heading hierarchy by ensuring proper H2→H3→H4 flow without skipping levels.',
      'SEO-012': 'Add your primary keyword within the first 100 words of the content.',
      'SEO-013': 'Add at least one internal link to related content on your site.',
      'SEO-020': 'Add descriptive alt text to all images for accessibility and SEO.'
    };

    return fixSuggestions[result.rule] || `Fix the ${result.rule} issue: ${result.message}`;
  }

  private determineImpact(rule: string): string {
    const impactMap: Record<string, string> = {
      'SEO-001': 'Significant impact on search rankings and click-through rates',
      'SEO-002': 'Improves content organization and crawling',
      'SEO-004': 'Better search engine snippet display and user engagement',
      'SEO-011': 'Improved content structure and user experience',
      'SEO-012': 'Enhanced keyword relevance and topical authority',
      'SEO-013': 'Better site structure and user navigation',
      'SEO-020': 'Improved accessibility and image search visibility'
    };

    return impactMap[rule] || 'Moderate SEO improvement';
  }

  private generateBeforeExample(result: SEOLintResult): string | undefined {
    // This would extract the problematic content based on the rule
    // For now, return undefined as this would require more context
    return undefined;
  }

  private generateAfterExample(result: SEOLintResult): string | undefined {
    // This would show the corrected content
    // For now, return undefined as this would require more context
    return undefined;
  }

  private extractKeywordsFromContent(content: string): string[] {
    // Extract keywords from frontmatter and content
    const matches = content.match(/keywords?:\s*\[([^\]]+)\]/);
    if (matches) {
      return matches[1].split(',').map(k => k.trim().replace(/['"]/g, ''));
    }
    return [];
  }

  private mapAIPriority(aiPriority: string): FixSuggestion['priority'] {
    switch (aiPriority.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapAICategory(aiType: string): FixSuggestion['category'] {
    switch (aiType.toLowerCase()) {
      case 'seo':
      case 'keyword': return 'seo';
      case 'readability':
      case 'content': return 'content';
      case 'structure':
      case 'heading': return 'structure';
      default: return 'technical';
    }
  }

  private isSimpleTextChange(suggestion: any): boolean {
    // Determine if this is a simple text replacement
    return suggestion.type === 'text_replacement' ||
           suggestion.type === 'keyword_optimization' ||
           (suggestion.recommendation && suggestion.recommendation.length < 200);
  }

  private estimateDifficulty(suggestion: any): FixSuggestion['difficulty'] {
    if (suggestion.type === 'text_replacement') return 'easy';
    if (suggestion.type === 'structure_change') return 'hard';
    return 'medium';
  }

  private estimateTimeRequired(suggestion: any): string {
    switch (suggestion.type) {
      case 'text_replacement': return '2-5 min';
      case 'keyword_optimization': return '5-10 min';
      case 'structure_change': return '20-45 min';
      default: return '10-20 min';
    }
  }

  private parseTimeEstimate(timeStr: string): number {
    // Parse "2-5 min" to average minutes (3.5)
    const match = timeStr.match(/(\d+)(?:-(\d+))?\s*min/);
    if (!match) return 15; // default

    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : min;
    return (min + max) / 2;
  }

  private formatTotalTime(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    } else if (minutes < 480) { // 8 hours
      const hours = Math.round(minutes / 60 * 10) / 10;
      return `${hours} hours`;
    } else {
      const days = Math.round(minutes / 480 * 10) / 10;
      return `${days} days`;
    }
  }

  private generateRecommendations(fixes: FixSuggestion[]): string[] {
    const recommendations = [];

    const autoFixable = fixes.filter(f => f.autoFixable);
    const criticalIssues = fixes.filter(f => f.priority === 'critical');
    const seoIssues = fixes.filter(f => f.category === 'seo');

    if (autoFixable.length > 0) {
      recommendations.push(`Start with ${autoFixable.length} auto-fixable issues to get quick wins`);
    }

    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical issues first to prevent SEO penalties`);
    }

    if (seoIssues.length > fixes.length * 0.5) {
      recommendations.push('Focus on SEO fundamentals - over 50% of issues are SEO-related');
    }

    recommendations.push('Review and test changes in staging before applying to production');
    recommendations.push('Consider setting up automated SEO monitoring to prevent future issues');

    return recommendations;
  }

  private generateNextSteps(fixes: FixSuggestion[], autoFixable: number, manual: number): string[] {
    const steps = [];

    if (autoFixable > 0) {
      steps.push(`Run 'gtm-toolkit fix --auto --confidence high' to apply ${autoFixable} automatic fixes`);
    }

    if (manual > 0) {
      steps.push(`Review ${manual} issues requiring manual attention (marked in execution plan below)`);
    }

    steps.push("Re-run 'gtm-toolkit audit' after applying fixes to measure improvement");
    steps.push("Set up monitoring: 'gtm-toolkit track --schedule weekly' for ongoing optimization");

    return steps;
  }

  async generateMarkdownReport(plan: ExecutionPlan, outputPath: string): Promise<void> {
    const markdown = this.formatExecutionPlanAsMarkdown(plan);
    await fs.writeFile(outputPath, markdown, 'utf-8');
  }

  private formatExecutionPlanAsMarkdown(plan: ExecutionPlan): string {
    const { summary, fixes, recommendations, nextSteps } = plan;

    return `# GTM Toolkit - Content Optimization Execution Plan

*Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*

## 📊 Executive Summary

- **Total Issues Found:** ${summary.totalIssues}
- **Auto-fixable Issues:** ${summary.autoFixableIssues}
- **Manual Review Required:** ${summary.manualReviewIssues}
- **Estimated Total Time:** ${summary.estimatedTotalTime}

### Priority Breakdown
${Object.entries(summary.priorityBreakdown)
  .map(([priority, count]) => `- **${priority.charAt(0).toUpperCase() + priority.slice(1)}:** ${count} issues`)
  .join('\n')}

## 🎯 Key Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

## 🚀 Next Steps

${nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## 📋 Detailed Execution Plan

### 🤖 Auto-Fixable Issues (${summary.autoFixableIssues} items)

${fixes
  .filter(f => f.autoFixable)
  .map(fix => `
#### ${fix.priority.toUpperCase()}: ${fix.issue}
- **File:** \`${fix.file}\`
- **Category:** ${fix.category}
- **Impact:** ${fix.impact}
- **Time:** ${fix.estimatedTime}
- **Fix:** ${fix.suggestion}
${fix.beforeExample ? `- **Before:** \`${fix.beforeExample}\`` : ''}
${fix.afterExample ? `- **After:** \`${fix.afterExample}\`` : ''}
`).join('\n---\n')}

### 👨‍💻 Manual Review Required (${summary.manualReviewIssues} items)

${fixes
  .filter(f => !f.autoFixable)
  .map(fix => `
#### ${fix.priority.toUpperCase()}: ${fix.issue}
- **File:** \`${fix.file}\`
- **Category:** ${fix.category}
- **Difficulty:** ${fix.difficulty}
- **Impact:** ${fix.impact}
- **Confidence:** ${fix.confidence}
- **Time:** ${fix.estimatedTime}
- **Suggestion:** ${fix.suggestion}
${fix.beforeExample ? `- **Current:** \`${fix.beforeExample}\`` : ''}
${fix.afterExample ? `- **Suggested:** \`${fix.afterExample}\`` : ''}
`).join('\n---\n')}

## 🎯 Success Metrics

After implementing these fixes, you should see:

1. **SEO Score Improvement:** Target 15-25% increase in overall SEO compliance
2. **Search Performance:** Better rankings for target keywords within 2-4 weeks
3. **User Experience:** Improved content readability and structure
4. **Technical Health:** Fewer crawl errors and better site architecture

## 💡 Long-term Strategy

1. **Set up automated monitoring** to catch issues early
2. **Establish content review process** with these SEO standards
3. **Regular audits** (monthly) to maintain content quality
4. **Track performance metrics** to measure ROI of optimizations

---

*This report was generated by GTM Toolkit with Claude AI analysis. For questions or support, visit our [documentation](https://gtmascode.dev/docs).*
`;
  }
}