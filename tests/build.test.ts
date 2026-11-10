import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildArtifacts, planArtifacts, writeArtifacts } from '../src/build';
import { AI_CRAWLERS } from '../src/build/crawlers';
import { ROOT_YAML, open, post } from './helpers';

const artifact = (files: Record<string, string>, name: string): string => {
  const { spec, items } = open(files);
  const found = buildArtifacts(spec, items).find((entry) => entry.name === name);
  if (!found) throw new Error(`no ${name} artifact`);
  return found.content;
};

describe('robots.txt', () => {
  it('allows everything by default and never emits a group for an allowed crawler', () => {
    const robots = artifact({}, 'robots');
    expect(robots).toContain('User-agent: *\nAllow: /\n');
    expect(robots).toContain('Sitemap: https://www.acme.dev/sitemap.xml');
    expect(robots.match(/^User-agent:/gm)).toHaveLength(1);
    expect(robots).not.toMatch(/Crawl-delay|_next/);
  });

  it('blocks a whole purpose in one group', () => {
    const robots = artifact({ 'gtm/gtm.yaml': `${ROOT_YAML}crawlers:\n  disallow: [/api/]\n  ai:\n    training: disallow\n` }, 'robots');
    expect(robots).toContain('User-agent: *\nAllow: /\nDisallow: /api/\n');
    const training = AI_CRAWLERS.filter((crawler) => crawler.purpose === 'training');
    for (const crawler of training) expect(robots).toContain(`User-agent: ${crawler.agent}\n`);
    expect(robots).toMatch(/User-agent: Amazonbot\nDisallow: \/\n/);
    expect(robots).not.toContain('User-agent: OAI-SearchBot');
    expect(robots).not.toContain('User-agent: ChatGPT-User');
  });

  it('lets one agent be overridden, including agents the toolkit has never heard of', () => {
    const robots = artifact({ 'gtm/gtm.yaml': `${ROOT_YAML}crawlers:\n  ai:\n    training: disallow\n  agents:\n    GPTBot: allow\n    SomeNewBot: disallow\n` }, 'robots');
    expect(robots).not.toContain('User-agent: GPTBot');
    expect(robots).toContain('User-agent: SomeNewBot');
  });

  it('covers the three purposes for the major assistants', () => {
    for (const operator of ['OpenAI', 'Anthropic']) {
      expect(AI_CRAWLERS.filter((crawler) => crawler.operator === operator).map((crawler) => crawler.purpose).sort()).toEqual(['search', 'training', 'user']);
    }
  });
});

describe('sitemap.xml', () => {
  const extra = {
    'content/blog/2026-03-01-draft.md': post({ title: 'A draft that should not ship', description: 'd'.repeat(80), date: '2026-03-01', draft: true }),
    'content/blog/2026-03-02-hidden.md': post({ title: 'A page hidden from search engines', description: 'h'.repeat(80), date: '2026-03-02', noindex: true }),
    'content/blog/2026-03-03-updated.md': post({ title: 'A page that was revised later on', description: 'u'.repeat(80), date: '2026-03-03', updated: '2026-04-01' }),
  };

  it('lists routes and published content under the canonical origin, with real dates only', () => {
    const sitemap = artifact(extra, 'sitemap');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toEqual([
      'https://www.acme.dev/',
      'https://www.acme.dev/blog',
      'https://www.acme.dev/pricing',
      'https://www.acme.dev/blog/2026-01-05-what-gtm-as-code-means',
      'https://www.acme.dev/blog/2026-03-03-updated',
      'https://www.acme.dev/docs',
    ]);
    expect(sitemap).toContain('<loc>https://www.acme.dev/blog/2026-03-03-updated</loc>\n    <lastmod>2026-04-01</lastmod>');
    expect(sitemap).not.toMatch(/changefreq|priority/);
  });

  it('dates a listing route by its newest item', () => {
    expect(artifact(extra, 'sitemap')).toContain('<loc>https://www.acme.dev/blog</loc>\n    <lastmod>2026-04-01</lastmod>');
  });

  it('uses the file name as the slug, never a guess from the title', () => {
    const sitemap = artifact({}, 'sitemap');
    expect(sitemap).toContain('/blog/2026-01-05-what-gtm-as-code-means<');
    expect(sitemap).not.toContain('/blog/what-gtm-as-code-means-for-a-small-team');
  });

  it('escapes XML', () => {
    const sitemap = artifact({ 'gtm/gtm.yaml': ROOT_YAML.replace('    - /blog\n', '    - /blog\n    - "/search?q=a&b=c"\n') }, 'sitemap');
    expect(sitemap).toContain('/search?q=a&amp;b=c');
  });
});

describe('llms.txt', () => {
  it('follows the llmstxt.org shape: H1, blockquote, then sections of links', () => {
    const llms = artifact({ 'gtm/positioning.yaml': 'category: Tools\noneLiner: Rockets as a service for coyotes.\nproblem: Roadrunners.\nnotThis:\n  - Not a catapult vendor.\n' }, 'llms');
    const lines = llms.split('\n');
    expect(lines[0]).toBe('# Acme');
    expect(lines[2]).toBe('> Acme makes rockets for coyotes.');
    expect(llms).toContain('Rockets as a service for coyotes.');
    expect(llms).toContain('Not to be confused with:\n\n- Not a catapult vendor.');
    expect(llms).toContain('## Pages\n\n- [Home](https://www.acme.dev/)\n- [Pricing](https://www.acme.dev/pricing): What it costs.');
    expect(llms).toMatch(/## Blog\n\n- \[What GTM as code means for a small team\]\(https:\/\/www\.acme\.dev\/blog\/2026-01-05-what-gtm-as-code-means\): A plain explanation/);
  });

  it('orders articles newest first', () => {
    const llms = artifact({ 'content/blog/2026-02-01-newer.md': post({ title: 'A newer article than the first', description: 'n'.repeat(80), date: '2026-02-01' }) }, 'llms');
    expect(llms.indexOf('A newer article')).toBeLessThan(llms.indexOf('What GTM as code means'));
  });
});

describe('GTM.md', () => {
  it('compiles the strategy into one brief', () => {
    const context = artifact({}, 'context');
    expect(context).toContain('# GTM context: Acme');
    expect(context).toContain('### Technical founder (`founder`)');
    expect(context).toContain('- "GTM as code", not "GTM-as-code", "marketing as code"');
    expect(context).toContain('- "leverage". Say what the thing does.');
    expect(context).toContain('Published pieces tagged with this topic: 1');
    expect(context).toContain('`seo/internal-links` (error)');
    expect(context).toContain('Run `npx gtm check`');
  });

  it('tells agents not to assert a claim that has no proof', () => {
    const context = artifact({ 'gtm/positioning.yaml': 'category: Tools\noneLiner: Rockets.\nproblem: Roadrunners.\ndifferentiators:\n  - id: fast\n    claim: Fastest rockets.\n' }, 'context');
    expect(context).toContain('**Fastest rockets.** (no proof on file: do not state this as fact)');
  });

  it('leaves out rules that are switched off', () => {
    expect(artifact({}, 'context')).not.toContain('messaging/untagged');
  });
});

describe('structured data', () => {
  it('is opt-in and describes the site and its owner', () => {
    const config = `${ROOT_YAML}owner:\n  type: person\n  name: Wile E.\n  jobTitle: Genius\n  sameAs: ["https://example.org/wile"]\noutputs:\n  schema: lib/schema.json\n`;
    const { spec, items } = open({ 'gtm/gtm.yaml': config });
    const schema = buildArtifacts(spec, items).find((entry) => entry.name === 'schema');
    expect(schema?.path).toBe('lib/schema.json');
    const graph = JSON.parse(schema?.content ?? '{}')['@graph'];
    expect(graph[0]).toMatchObject({ '@type': 'Person', name: 'Wile E.', jobTitle: 'Genius', sameAs: ['https://example.org/wile'] });
    expect(graph[1]).toMatchObject({ '@type': 'WebSite', url: 'https://www.acme.dev', publisher: { '@id': 'https://www.acme.dev/#owner' } });
    expect(buildArtifacts(open().spec, []).some((entry) => entry.name === 'schema')).toBe(false);
  });
});

describe('build plan', () => {
  it('is deterministic: no timestamps, same bytes every time', () => {
    const a = open();
    const b = open();
    expect(buildArtifacts(a.spec, a.items)).toEqual(buildArtifacts(b.spec, b.items));
    expect(JSON.stringify(buildArtifacts(a.spec, a.items))).not.toMatch(/20\d\d-\d\d-\d\dT/);
  });

  it('reports missing, then unchanged, then changed with the first differing line', () => {
    const { root, spec, items } = open();
    const artifacts = buildArtifacts(spec, items);
    const first = planArtifacts(root, artifacts);
    expect(first.map((entry) => entry.status)).toEqual(['missing', 'missing', 'missing', 'missing']);

    writeArtifacts(root, first);
    expect(planArtifacts(root, artifacts).every((entry) => entry.status === 'unchanged')).toBe(true);
    expect(readFileSync(join(root, 'public/llms.txt'), 'utf8')).toBe(artifacts[2].content);

    writeFileSync(join(root, 'public/robots.txt'), artifacts[0].content.replace('Allow: /', 'Disallow: /'));
    const robots = planArtifacts(root, artifacts)[0];
    expect(robots).toMatchObject({ status: 'changed', firstDiff: { line: 4, expected: 'Allow: /', actual: 'Disallow: /' } });
  });

  it('skips outputs set to false', () => {
    const { spec, items } = open({ 'gtm/gtm.yaml': `${ROOT_YAML}outputs:\n  llms: false\n  context: false\n` });
    expect(buildArtifacts(spec, items).map((entry) => entry.name)).toEqual(['robots', 'sitemap']);
  });
});
