// SEO Rules Engine - Based on proven guard rails from raz-kaplan-website
/* eslint-disable @typescript-eslint/no-explicit-any */

import path from 'path';
import matter from 'gray-matter';
import { SEOLintRule, SEOLintResult, SEOLintRuleResult, SEOLintReport, SEOLintSummary } from '../types';
export type { SEOLintResult, SEOLintRule } from '../types';

// Primary keywords for validation
const PRIMARY_KEYWORDS = [
  'gtm as code',
  'modern marketing', 
  'developer marketing',
  'product-led growth',
  'product-led sales',
  'content linter',
  'seo guard rails',
  'ai search optimization',
  'vibe coding',
  'telemetry',
  'growth reviews',
  'pricing as a product',
  'posthog'
];

const SECONDARY_KEYWORDS = [
  'content as code',
  'growth engineering', 
  'continuous marketing',
  'observability',
  'open handbook',
  'repo-first website',
  'changelog automation',
  'feature flags',
  'internal tools',
  'brand consistency'
];

const ALLOWED_CATEGORIES = ['gtm', 'SEO', 'vibe coding', 'OUT-OF-STEALTH'];

const ignore = (..._args: unknown[]): void => {
  void _args;
};

// SEO Rules Implementation
export const SEO_RULES: SEOLintRule[] = [
  // Must-Have Front Matter Rules (SEO-001 to SEO-006)
  {
    id: 'SEO-001',
    name: 'Title Requirements',
    description: 'Title present, 45-70 characters, uses primary keyword near start',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(content);
      if (!frontmatter.title) {
        return {
          passed: false,
          message: 'Title is required in frontmatter',
          suggestion: 'Add a title field with 45-70 characters'
        };
      }
      
      const titleLength = frontmatter.title.length;
      if (titleLength < 45 || titleLength > 70) {
        return {
          passed: false,
          message: `Title length is ${titleLength} chars (should be 45-70)`,
          suggestion: titleLength < 45 ? 'Make title longer and more descriptive' : 'Shorten title for better SEO'
        };
      }
      
      // Check for primary keyword in first half of title
      const firstHalf = frontmatter.title.toLowerCase().substring(0, titleLength / 2);
      const hasKeyword = PRIMARY_KEYWORDS.some(keyword => 
        firstHalf.includes(keyword.toLowerCase())
      );
      
      if (!hasKeyword) {
        return {
          passed: false,
          message: 'No primary keyword found in title start',
          suggestion: `Include one of these keywords near the beginning: ${PRIMARY_KEYWORDS.join(', ')}`
        };
      }
      
      return { passed: true, message: `Title validated: ${titleLength} chars with keyword` };
    }
  },
  
  {
    id: 'SEO-002',
    name: 'Date Format',
    description: 'Date present in ISO YYYY-MM-DD format',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(content);
      if (!frontmatter.date) {
        return {
          passed: false,
          message: 'Date is required in frontmatter',
          suggestion: 'Add date field in YYYY-MM-DD format'
        };
      }
      
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(frontmatter.date)) {
        return {
          passed: false,
          message: `Invalid date format: ${frontmatter.date}`,
          suggestion: 'Use YYYY-MM-DD format (e.g., 2025-01-15)'
        };
      }
      
      return { passed: true, message: `Date format validated: ${frontmatter.date}` };
    }
  },
  
  {
    id: 'SEO-003',
    name: 'Category Validation',
    description: 'Category present and from allowed list',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(content);
      if (!frontmatter.category) {
        return {
          passed: false,
          message: 'Category is required in frontmatter',
          suggestion: `Add category field. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`
        };
      }
      
      if (!ALLOWED_CATEGORIES.includes(frontmatter.category)) {
        return {
          passed: false,
          message: `Invalid category: ${frontmatter.category}`,
          suggestion: `Use one of: ${ALLOWED_CATEGORIES.join(', ')}`
        };
      }
      
      return { passed: true, message: `Category validated: ${frontmatter.category}` };
    }
  },
  
  {
    id: 'SEO-004',
    name: 'Summary Requirements',
    description: 'Summary present, 120-160 characters, acts as meta description',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(content);
      if (!frontmatter.summary) {
        return {
          passed: false,
          message: 'Summary is required in frontmatter',
          suggestion: 'Add summary field with 120-160 characters describing the content'
        };
      }
      
      const summaryLength = frontmatter.summary.length;
      if (summaryLength < 120 || summaryLength > 160) {
        return {
          passed: false,
          message: `Summary length is ${summaryLength} chars (should be 120-160)`,
          suggestion: summaryLength < 120 ? 'Expand summary with more detail' : 'Shorten summary for better meta description'
        };
      }
      
      // Check for keywords in summary
      const summaryLower = frontmatter.summary.toLowerCase();
      const hasKeywords = [...PRIMARY_KEYWORDS, ...SECONDARY_KEYWORDS].some(keyword =>
        summaryLower.includes(keyword.toLowerCase())
      );
      
      if (!hasKeywords) {
        return {
          passed: false,
          message: 'No target keywords found in summary',
          suggestion: 'Include 1-2 relevant keywords naturally in the summary'
        };
      }
      
      return { passed: true, message: `Summary validated: ${summaryLength} chars with keywords` };
    }
  },
  
  {
    id: 'SEO-005',
    name: 'Read Time',
    description: 'Readtime present (e.g., "3 min read")',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(content);
      if (!frontmatter.Readtime && !frontmatter.readtime) {
        return {
          passed: false,
          message: 'Readtime is required in frontmatter',
          suggestion: 'Add Readtime field (e.g., "5 min read")'
        };
      }
      
      const readtime = frontmatter.Readtime || frontmatter.readtime;
      const readtimeRegex = /^\d+\s+min\s+read$/;
      if (!readtimeRegex.test(readtime)) {
        return {
          passed: false,
          message: `Invalid readtime format: ${readtime}`,
          suggestion: 'Use format like "3 min read"'
        };
      }
      
      return { passed: true, message: `Readtime validated: ${readtime}` };
    }
  },
  
  {
    id: 'SEO-006',
    name: 'Filename Validation',
    description: 'Filename is date-prefixed slug matching title gist',
    severity: 'error',
    check: (content: string, frontmatter: any, filename?: string): SEOLintRuleResult => {
      if (!filename) {
        return {
          passed: false,
          message: 'Filename not provided for validation',
          suggestion: 'Ensure filename follows YYYY-MM-DD-slug.md format'
        };
      }
      
      const filenameRegex = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
      if (!filenameRegex.test(filename)) {
        return {
          passed: false,
          message: `Invalid filename format: ${filename}`,
          suggestion: 'Use YYYY-MM-DD-slug.md format'
        };
      }
      
      // Extract date from filename and compare with frontmatter
      const fileDate = filename.substring(0, 10);
      if (frontmatter.date && frontmatter.date !== fileDate) {
        return {
          passed: false,
          message: `Filename date (${fileDate}) doesn't match frontmatter date (${frontmatter.date})`,
          suggestion: 'Ensure filename date matches frontmatter date'
        };
      }
      
      return { passed: true, message: `Filename validated: ${filename}` };
    }
  },
  
  // Content Structure Rules (SEO-010 to SEO-014)
  {
    id: 'SEO-010',
    name: 'Single H1 Rule',
    description: 'Exactly one H1 from frontmatter title, no # H1 in body',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      const h1Matches = content.match(/^# /gm);
      if (h1Matches && h1Matches.length > 0) {
        return {
          passed: false,
          message: `Found ${h1Matches.length} H1 heading(s) in content body`,
          suggestion: 'Remove H1 headings from body. H1 comes from frontmatter title.'
        };
      }
      
      if (!frontmatter.title) {
        return {
          passed: false,
          message: 'No H1 available - missing title in frontmatter',
          suggestion: 'Add title in frontmatter to serve as H1'
        };
      }
      
      return { passed: true, message: 'H1 structure validated (title only)' };
    }
  },
  
  {
    id: 'SEO-011',
    name: 'Heading Hierarchy',
    description: 'Use hierarchical headings H2/H3, no jumps',
    severity: 'warning',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      const headings = content.match(/^#{2,6} .+$/gm) || [];
      const headingLevels = headings.map(h => h.match(/^#+/)?.[0].length || 0);
      
      for (let i = 1; i < headingLevels.length; i++) {
        const current = headingLevels[i];
        const previous = headingLevels[i - 1];
        
        if (current > previous + 1) {
          return {
            passed: false,
            message: `Heading jump detected: H${previous} to H${current}`,
            suggestion: 'Use sequential heading levels (H2 → H3, not H2 → H4)'
          };
        }
      }
      
      return { passed: true, message: `Heading hierarchy validated (${headings.length} headings)` };
    }
  },
  
  {
    id: 'SEO-012',
    name: 'Keyword in Opening',
    description: 'First 100 words mention primary keyword once, naturally',
    severity: 'warning',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      // Remove frontmatter and get first 100 words
      const bodyContent = content.replace(/^---[\s\S]*?---/m, '').trim();
      const words = bodyContent.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
      
      const hasKeyword = PRIMARY_KEYWORDS.some(keyword =>
        words.includes(keyword.toLowerCase())
      );
      
      if (!hasKeyword) {
        return {
          passed: false,
          message: 'No primary keyword found in first 100 words',
          suggestion: `Naturally include a primary keyword: ${PRIMARY_KEYWORDS.slice(0, 3).join(', ')}`
        };
      }
      
      return { passed: true, message: 'Primary keyword found in opening content' };
    }
  },
  
  {
    id: 'SEO-013',
    name: 'Internal Linking',
    description: 'At least one internal link to relevant post/page',
    severity: 'warning',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      // Look for internal links (relative paths or same domain)
      const internalLinks = content.match(/\[([^\]]+)\]\((\/[^)]+|#[^)]+)\)/g) || [];
      
      if (internalLinks.length === 0) {
        return {
          passed: false,
          message: 'No internal links found',
          suggestion: 'Add at least one internal link to related content'
        };
      }
      
      return { passed: true, message: `Internal linking validated (${internalLinks.length} links)` };
    }
  },
  
  {
    id: 'SEO-014',
    name: 'Descriptive Link Text',
    description: 'External links use descriptive anchor text',
    severity: 'warning',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      const links = content.match(/\[([^\]]+)\]\([^)]+\)/g) || [];
      const badLinks = [];
      
      for (const link of links) {
        const linkText = link.match(/\[([^\]]+)\]/)?.[1] || '';
        if (/^(https?:\/\/|www\.|click here|here|link|read more)$/i.test(linkText.trim())) {
          badLinks.push(linkText);
        }
      }
      
      if (badLinks.length > 0) {
        return {
          passed: false,
          message: `Found ${badLinks.length} non-descriptive link(s)`,
          suggestion: 'Use descriptive anchor text instead of URLs or "click here"'
        };
      }
      
      return { passed: true, message: `Link text validated (${links.length} links)` };
    }
  },
  
  // Media & Accessibility Rules (SEO-020 to SEO-021)
  {
    id: 'SEO-020',
    name: 'Image Alt Text',
    description: 'Images have meaningful alt text',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      const images = content.match(/!\[([^\]]*)\]\([^)]+\)/g) || [];
      if (images.length === 0) {
        return { passed: true, message: 'No images found - validation passed' };
      }
      
      const missingAlt = [];
      for (const img of images) {
        const altText = img.match(/!\[([^\]]*)\]/)?.[1] || '';
        if (altText.trim().length === 0) {
          missingAlt.push(img);
        }
      }
      
      if (missingAlt.length > 0) {
        return {
          passed: false,
          message: `${missingAlt.length} image(s) missing alt text`,
          suggestion: 'Add descriptive alt text for all images'
        };
      }
      
      return { passed: true, message: `Image alt text validated (${images.length} images)` };
    }
  },
  
  // Technical Meta Rules (SEO-030 to SEO-031)
  {
    id: 'SEO-031',
    name: 'No Placeholder Content',
    description: 'No placeholder links or lorem ipsum',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      const placeholders = [
        /\[([^\]]+)\]\(#\)/g, // [text](#)
        /\[([^\]]+)\]\(\/todo\)/gi, // [text](/todo)
        /example\.com/gi,
        /lorem\s+ipsum/gi,
        /\btbd\b/gi,
        /\bfixme\b/gi,
        /\btodo\b(?!:)/gi // TODO but not TODO:
      ];
      
      const found = [];
      for (const pattern of placeholders) {
        const matches = content.match(pattern);
        if (matches) {
          found.push(...matches);
        }
      }
      
      if (found.length > 0) {
        return {
          passed: false,
          message: `Found ${found.length} placeholder(s): ${found.slice(0, 3).join(', ')}`,
          suggestion: 'Replace placeholder content with real links and text'
        };
      }
      
      return { passed: true, message: 'No placeholder content found' };
    }
  },
  
  // Readability Rules (SEO-040 to SEO-042)
  {
    id: 'SEO-040',
    name: 'Sentence Length',
    description: 'Sentences under 25-30 words in first two paragraphs',
    severity: 'info',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      const bodyContent = content.replace(/^---[\s\S]*?---/m, '').trim();
      const paragraphs = bodyContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      if (paragraphs.length < 2) {
        return { passed: true, message: 'Not enough paragraphs for sentence analysis' };
      }
      
      const firstTwoParagraphs = paragraphs.slice(0, 2).join(' ');
      const sentences = firstTwoParagraphs.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      const longSentences = sentences.filter(s => s.split(/\s+/).length > 30);
      
      if (longSentences.length > 0) {
        return {
          passed: false,
          message: `${longSentences.length} sentence(s) over 30 words in opening`,
          suggestion: 'Break long sentences into shorter ones for better readability'
        };
      }
      
      return { passed: true, message: `Sentence length validated (${sentences.length} sentences)` };
    }
  },
  
  // Prohibited Patterns (SEO-050 to SEO-052)
  {
    id: 'SEO-051',
    name: 'Markdown Syntax',
    description: 'No broken Markdown syntax',
    severity: 'error',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      const issues = [];
      
      // Unclosed links
      if (content.match(/\[[^\]]*\n/) || content.match(/\]\([^)]*\n/)) {
        issues.push('Unclosed link syntax');
      }
      
      // Unclosed code blocks
      const codeBlocks = content.match(/```/g) || [];
      if (codeBlocks.length % 2 !== 0) {
        issues.push('Unclosed code block');
      }
      
      // Malformed headings
      if (content.match(/^#{7,}/m)) {
        issues.push('Invalid heading level (H7+)');
      }
      
      if (issues.length > 0) {
        return {
          passed: false,
          message: `Markdown syntax issues: ${issues.join(', ')}`,
          suggestion: 'Fix Markdown syntax errors'
        };
      }
      
      return { passed: true, message: 'Markdown syntax validated' };
    }
  },
  
  {
    id: 'SEO-052',
    name: 'Keyword Density',
    description: 'Keyword density under 2.5%',
    severity: 'warning',
    check: (content: string, frontmatter: any): SEOLintRuleResult => {
      ignore(frontmatter);
      const bodyContent = content.replace(/^---[\s\S]*?---/m, '').toLowerCase();
      const words = bodyContent.split(/\s+/).filter(w => w.length > 2);
      const totalWords = words.length;
      
      for (const keyword of PRIMARY_KEYWORDS) {
        const keywordCount = (bodyContent.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
        const density = (keywordCount / totalWords) * 100;
        
        if (density > 2.5) {
          return {
            passed: false,
            message: `Keyword "${keyword}" density is ${density.toFixed(1)}% (should be < 2.5%)`,
            suggestion: 'Reduce keyword repetition and vary your language'
          };
        }
      }
      
      return { passed: true, message: 'Keyword density within acceptable range' };
    }
  }
];

// Rule lookup by ID
export const getRuleById = (id: string): SEOLintRule | undefined => {
  return SEO_RULES.find(rule => rule.id === id);
};

// Get rules by severity
export const getRulesBySeverity = (severity: 'error' | 'warning' | 'info'): SEOLintRule[] => {
  return SEO_RULES.filter(rule => rule.severity === severity);
};

// Get all rule IDs
export const getAllRuleIds = (): string[] => {
  return SEO_RULES.map(rule => rule.id);
};

export interface LintContentOptions {
  filePath?: string;
  filename?: string;
  frontmatter?: Record<string, any>;
}

export function lintContent(rawContent: string, filename?: string): SEOLintResult[];
export function lintContent(rawContent: string, options?: LintContentOptions): SEOLintResult[];
export function lintContent(
  rawContent: string,
  optionsOrFilename?: LintContentOptions | string
): SEOLintResult[] {
  const normalizedOptions: LintContentOptions =
    typeof optionsOrFilename === 'string'
      ? { filename: optionsOrFilename }
      : optionsOrFilename ?? {};

  const { frontmatter: providedFrontmatter } = normalizedOptions;

  let frontmatter: Record<string, any> = providedFrontmatter ?? {};
  if (!providedFrontmatter) {
    try {
      const parsed = matter(rawContent);
      frontmatter = (parsed.data as Record<string, any>) || {};
    } catch {
      frontmatter = {};
    }
  }

  const filename =
    normalizedOptions.filename ||
    (normalizedOptions.filePath ? path.basename(normalizedOptions.filePath) : undefined);

  return SEO_RULES.map(rule => {
    const result = rule.check(rawContent, frontmatter, filename);
    return {
      rule: rule.id,
      name: rule.name,
      severity: rule.severity,
      ...result
    };
  });
}

export const summarizeLintResults = (results: SEOLintResult[]): { summary: SEOLintSummary; score: number } => {
  const summary = results.reduce<SEOLintSummary>(
    (acc, result) => {
      if (result.passed) {
        acc.passed += 1;
      } else if (result.severity === 'error') {
        acc.errors += 1;
      } else if (result.severity === 'warning') {
        acc.warnings += 1;
      }
      return acc;
    },
    { errors: 0, warnings: 0, passed: 0 }
  );

  const score = results.length > 0 ? (summary.passed / results.length) * 100 : 100;
  return { summary, score };
};

export const createLintReport = (
  rawContent: string,
  options: LintContentOptions = {}
): SEOLintReport => {
  const results = lintContent(rawContent, options);
  const { summary, score } = summarizeLintResults(results);

  return {
    file: options.filePath || options.filename || 'unknown',
    results,
    score,
    summary
  };
};
