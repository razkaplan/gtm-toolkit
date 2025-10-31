// Local AI guideline helpers for content optimization workflows.
// These helpers produce prompts that creators can feed into tools like
// GitHub Copilot, Cursor, Claude Desktop, or any preferred local AI assistant.

import { CompetitorAnalysis } from '../types';

export interface LocalAIInstruction {
  title: string;
  objective: string;
  prompt: string;
  recommendedAssistants: string[];
  suggestedSteps: string[];
}

const DEFAULT_ASSISTANTS = [
  'GitHub Copilot',
  'Cursor',
  'ChatGPT with local context',
  'Claude Desktop',
  'Custom internal code assistant'
];

function buildHeader(title: string, objective: string): Omit<LocalAIInstruction, 'prompt' | 'suggestedSteps'> {
  return {
    title,
    objective,
    recommendedAssistants: DEFAULT_ASSISTANTS
  };
}

export function createContentAnalysisInstruction(content: string, options: {
  targetKeywords?: string[];
  targetAudience?: string;
  analysisType?: string;
} = {}): LocalAIInstruction {
  const header = buildHeader(
    'Content Analysis Prompt',
    'Review the draft content and generate actionable SEO + readability improvements.'
  );

  const prompt = `Analyze the following content and produce:
- SEO optimization checklist
- Readability fixes
- Suggested headings structure
- Keyword usage commentary
- Top 3 recommendations with rationale

Content begins:
${content}

Target keywords: ${options.targetKeywords?.join(', ') || 'not specified'}
Target audience: ${options.targetAudience || 'general audience'}
Analysis type: ${options.analysisType || 'general SEO/readability audit'}
`;

  return {
    ...header,
    prompt,
    suggestedSteps: [
      'Paste the prompt into your local AI assistant.',
      'Ask for structured output (tables or bullet lists).',
      'Review results with your editorial checklist before applying changes.'
    ]
  };
}

export function createCompetitorInstruction(url: string): LocalAIInstruction {
  const header = buildHeader(
    'Competitor Benchmark Prompt',
    'Compare the competitor page against your positioning and highlight differentiation opportunities.'
  );

  const prompt = `Visit ${url} and evaluate the page using the following:
- Unique value propositions
- Content depth & structure
- Calls-to-action and funnel depth
- Keyword focus and search intent
- Opportunities for GTM Toolkit content to outperform
`;

  return {
    ...header,
    prompt,
    suggestedSteps: [
      'Open the competitor URL in your browser.',
      'Feed the URL plus this prompt to your local AI assistant.',
      'Summarize the analysis in a short internal brief.'
    ]
  };
}

export function createGapAnalysisInstruction(currentTopics: string[], competitorInsights: CompetitorAnalysis[]): LocalAIInstruction {
  const header = buildHeader(
    'Content Gap Analysis Prompt',
    'Identify topics, formats, and keywords missing from our content compared with competitors.'
  );

  const prompt = `We currently cover: ${currentTopics.join(', ') || 'no topics recorded'}.
Competitor notes:
${competitorInsights.map(entry => `- ${entry.url}: ${entry.contentTopics.join(', ')}`).join('\n') || '- None provided'}

Generate:
1. Top content gaps with estimated impact
2. Recommended next pieces (format, angle, primary keyword)
3. Supporting assets (lead magnets, CTAs, distribution ideas)
`;

  return {
    ...header,
    prompt,
    suggestedSteps: [
      'Feed your assistant the list of current topics + competitor summaries.',
      'Request a prioritized backlog with impact/effort scores.',
      'Share the output with product marketing for validation.'
    ]
  };
}

export function createKeywordResearchInstruction(topic: string, targetAudience: string): LocalAIInstruction {
  const header = buildHeader(
    'Keyword Research Prompt',
    'Generate long-tail and AEO-friendly keywords anchored to the target topic.'
  );

  const prompt = `Topic: ${topic}
Audience: ${targetAudience}

Request from your assistant:
- 20+ query variations (question-based, comparison, intent-based)
- Estimated search intent and funnel stage
- Suggested landing page or feature that maps to each query
- Potential AI overview (AEO) phrasing to include in copy
`;

  return {
    ...header,
    prompt,
    suggestedSteps: [
      'Combine the assistant output with Google Search Console data.',
      'Feed the final keyword list into GTM Toolkit gap analysis.',
      'Prioritize keywords with both buyer intent and AEO triggers.'
    ]
  };
}

export function createFixSuggestionInstruction(filePath: string, contentSnippet: string, focusAreas: string[]): LocalAIInstruction {
  const header = buildHeader(
    'Fix Execution Prompt',
    'Produce rewrite suggestions for the specified content areas.'
  );

  const prompt = `File: ${filePath}
Focus areas: ${focusAreas.join(', ') || 'general improvements'}

Content snippet:
${contentSnippet}

Instructions:
- Highlight specific sections to rewrite
- Provide before/after suggestions in markdown
- Flag any missing internal links, headings, or metadata
`;

  return {
    ...header,
    prompt,
    suggestedSteps: [
      'Limit the snippet length when pasting into your assistant.',
      'Review each suggestion and apply manually.',
      'Re-run `gtm-toolkit lint` after applying updates.'
    ]
  };
}

export function createContentBriefInstruction(topic: string, audience: string, keywords: string[]): LocalAIInstruction {
  const header = buildHeader(
    'Content Brief Prompt',
    'Create a structured brief for writers with SEO guard rails.'
  );

  const prompt = `Topic: ${topic}
Audience: ${audience}
Primary keywords: ${keywords.join(', ') || 'not specified'}

Request the assistant to produce:
- Working title and meta description
- Outline with H2/H3 structure
- Key talking points per section
- Internal/external link targets
- AI overview snippet ideas (FAQ, how-to summaries)
`;

  return {
    ...header,
    prompt,
    suggestedSteps: [
      'Share the brief with stakeholders before drafting.',
      'Store approved briefs in your content repo alongside GTM Toolkit reports.'
    ]
  };
}
