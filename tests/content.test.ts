import { describe, expect, it } from 'vitest';
import { isoDate, urlFor } from '../src/content/load';
import { findTerm, opening, scanMarkdown } from '../src/content/text';
import { open, post } from './helpers';

describe('scanMarkdown', () => {
  const body = ['Intro with `[not](a-link)` in code.', '', '```md', '# not a heading', '[skip](/nope) TODO', '```', '', '## Real', '', 'A [link](/a "t") and ![alt](/i.png) and <img src="/x.png">.'].join('\n');
  const scanned = scanMarkdown(body, 10);

  it('ignores fenced and inline code', () => {
    expect(scanned.headings).toEqual([{ level: 2, text: 'Real', line: 17 }]);
    expect(scanned.links.map((l) => l.url)).toEqual(['/a']);
    expect(scanned.prose.some((row) => row.text.includes('TODO'))).toBe(false);
  });

  it('keeps line and column positions from the source file', () => {
    expect(scanned.links[0]).toMatchObject({ line: 19, column: 3, text: 'link' });
  });

  it('collects markdown and html images, with or without alt text', () => {
    expect(scanned.images.map((i) => [i.src, i.alt])).toEqual([
      ['/i.png', 'alt'],
      ['/x.png', ''],
    ]);
  });

  it('reports a fence that never closes', () => {
    expect(scanMarkdown('text\n\n```js\nconst a = 1\n').unclosedFence).toBe(3);
    expect(scanMarkdown('````md\n```\ninner\n```\n````\n').unclosedFence).toBeUndefined();
  });

  it('returns the opening words without headings', () => {
    expect(opening(scanMarkdown('## Title\n\none two three four'), 3)).toBe('one two three');
  });
});

describe('findTerm', () => {
  it('matches whole words, case-insensitively', () => {
    expect(findTerm('We Leverage things', 'leverage')).toBe(3);
    expect(findTerm('leveraged buyout', 'leverage')).toBe(-1);
  });

  it('matches punctuation anywhere', () => {
    expect(findTerm('a — b', '—')).toBe(2);
  });

  it('treats any whitespace between words as one space', () => {
    expect(findTerm('GTM as\n  code', 'GTM as code')).toBe(0);
    expect(findTerm('GTM-as-code', 'GTM as code')).toBe(-1);
  });
});

describe('content loading', () => {
  it('maps files to URLs', () => {
    expect(urlFor('/blog/{slug}', '2026-01-05-hello.md')).toEqual({ slug: '2026-01-05-hello', url: '/blog/2026-01-05-hello' });
    expect(urlFor('/docs/{path}', 'index.md').url).toBe('/docs');
    expect(urlFor('/docs/{path}', 'guides/ci.md').url).toBe('/docs/guides/ci');
    expect(urlFor('/docs/{path}', 'guides/index.mdx').url).toBe('/docs/guides');
  });

  it('accepts dates as strings or YAML dates, and rejects impossible ones', () => {
    expect(isoDate('2026-02-28')).toBe('2026-02-28');
    expect(isoDate(new Date('2026-02-28T00:00:00Z'))).toBe('2026-02-28');
    expect(isoDate('2026-02-30')).toBeUndefined();
    expect(isoDate('March 3, 2026')).toBeUndefined();
  });

  it('reads frontmatter into a normalised item', () => {
    const { items } = open({
      'content/blog/2026-02-01-second.md': `---\ntitle: Second\nsummary: From summary.\ndate: 2026-02-01\ntopics: [gtm-as-code]\npersona: founder\nanswers:\n  - "What is GTM as code?"\ndraft: true\n---\n\nBody.\n`,
    });
    const item = items.find((entry) => entry.slug === '2026-02-01-second');
    expect(item).toMatchObject({
      collection: 'blog',
      type: 'article',
      url: '/blog/2026-02-01-second',
      description: 'From summary.',
      descriptionKey: 'summary',
      date: '2026-02-01',
      topics: ['gtm-as-code'],
      personas: ['founder'],
      answers: ['What is GTM as code?'],
      draft: true,
      bodyLine: 11,
    });
    expect(item?.keyLines.summary).toBe(3);
  });

  it('skips files matched by lint.ignore', () => {
    const { items } = open({
      'gtm/gtm.yaml': `version: 2\nsite: { name: A, url: "https://a.dev", description: d }\ncontent:\n  collections:\n    blog: { path: content/blog, url: "/blog/{slug}" }\nlint:\n  ignore: ["content/blog/drafts/**"]\n`,
      'content/blog/drafts/wip.md': post({ title: 'wip' }),
    });
    expect(items.map((item) => item.file)).toEqual(['content/blog/2026-01-05-what-gtm-as-code-means.md']);
  });
});
