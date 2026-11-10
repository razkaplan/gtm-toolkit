import type { Policy, Spec } from '../spec/schema';

export type CrawlerPurpose = 'training' | 'search' | 'user';

export interface AICrawler {
  /** The token to use in a robots.txt User-agent line. */
  agent: string;
  operator: string;
  purpose: CrawlerPurpose;
}

/**
 * AI crawlers that publish a robots.txt token, grouped by what they collect
 * content for. The grouping is the point: "may a model learn from this page"
 * and "may an assistant cite this page" are different decisions.
 *
 * robots.txt is a request, not an access control. Operators say user-triggered
 * fetchers in particular may ignore it.
 */
export const AI_CRAWLERS: AICrawler[] = [
  { agent: 'GPTBot', operator: 'OpenAI', purpose: 'training' },
  { agent: 'ClaudeBot', operator: 'Anthropic', purpose: 'training' },
  { agent: 'Google-Extended', operator: 'Google', purpose: 'training' },
  { agent: 'Applebot-Extended', operator: 'Apple', purpose: 'training' },
  { agent: 'CCBot', operator: 'Common Crawl', purpose: 'training' },
  { agent: 'Bytespider', operator: 'ByteDance', purpose: 'training' },
  { agent: 'meta-externalagent', operator: 'Meta', purpose: 'training' },
  { agent: 'Amazonbot', operator: 'Amazon', purpose: 'training' },
  { agent: 'OAI-SearchBot', operator: 'OpenAI', purpose: 'search' },
  { agent: 'Claude-SearchBot', operator: 'Anthropic', purpose: 'search' },
  { agent: 'PerplexityBot', operator: 'Perplexity', purpose: 'search' },
  { agent: 'DuckAssistBot', operator: 'DuckDuckGo', purpose: 'search' },
  { agent: 'ChatGPT-User', operator: 'OpenAI', purpose: 'user' },
  { agent: 'Claude-User', operator: 'Anthropic', purpose: 'user' },
  { agent: 'Perplexity-User', operator: 'Perplexity', purpose: 'user' },
  { agent: 'meta-externalfetcher', operator: 'Meta', purpose: 'user' },
  { agent: 'MistralAI-User', operator: 'Mistral', purpose: 'user' },
];

export interface CrawlerDecision {
  agent: string;
  operator?: string;
  purpose?: CrawlerPurpose;
  policy: Policy;
}

/** The policy for every known crawler, plus any extra agent named in the spec. */
export function crawlerDecisions(spec: Spec): CrawlerDecision[] {
  const overrides = new Map(Object.entries(spec.crawlers.agents).map(([agent, policy]) => [agent.toLowerCase(), policy]));
  const decisions: CrawlerDecision[] = AI_CRAWLERS.map((crawler) => ({
    ...crawler,
    policy: overrides.get(crawler.agent.toLowerCase()) ?? spec.crawlers.ai[crawler.purpose],
  }));
  const known = new Set(AI_CRAWLERS.map((crawler) => crawler.agent.toLowerCase()));
  for (const [agent, policy] of Object.entries(spec.crawlers.agents)) {
    if (!known.has(agent.toLowerCase())) decisions.push({ agent, policy });
  }
  return decisions;
}
