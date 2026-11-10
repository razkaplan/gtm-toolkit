import { describe, expect, it } from 'vitest';
import { RULES, lintContent } from '../src/lint';
import { GOOD_POST, ROOT_YAML, open, post } from './helpers';

const FILE = 'content/blog/2026-01-06-case.md';
const base = {
  title: 'A perfectly reasonable article title',
  description: 'A description that is long enough to say something useful about the article and short enough to survive.',
  date: '2026-01-06',
};

/** Lint one extra post and return the rule ids it trips. */
function trip(source: string, extra: Record<string, string> = {}): string[] {
  const { root, spec, items } = open({ [FILE]: source, ...extra });
  return lintContent(root, spec, items)
    .filter((d) => d.file === FILE)
    .map((d) => d.rule);
}

describe('lint: a clean project', () => {
  it('reports nothing', () => {
    const { root, spec, items } = open();
    expect(lintContent(root, spec, items)).toEqual([]);
  });

  it('has a unique id, a description and a rationale for every rule', () => {
    expect(new Set(RULES.map((rule) => rule.id)).size).toBe(RULES.length);
    for (const rule of RULES) {
      expect(rule.id).toMatch(/^(seo|messaging)\/[a-z0-9-]+$/);
      expect(rule.description.length).toBeGreaterThan(10);
      expect(rule.rationale.length).toBeGreaterThan(40);
    }
  });
});

describe('lint: seo rules', () => {
  const cases: Array<[string, string, string]> = [
    ['seo/title', 'missing title', post({ description: base.description, date: base.date })],
    ['seo/title-length', 'short title', post({ ...base, title: 'Short' })],
    ['seo/description', 'missing description', post({ title: base.title, date: base.date })],
    ['seo/description-length', 'short description', post({ ...base, description: 'Too short.' })],
    ['seo/date', 'missing date', post({ title: base.title, description: base.description })],
    ['seo/date', 'unparseable date', post({ ...base, date: 'March 3, 2026' })],
    ['seo/single-h1', 'h1 in body', post(base, '# Again\n\n[pricing](/pricing)\n')],
    ['seo/heading-order', 'skipped level', post(base, '## Two\n\n#### Four\n\n[pricing](/pricing)\n')],
    ['seo/image-alt', 'image without alt', post(base, '![](/logo.png) [pricing](/pricing)\n')],
    ['seo/link-text', 'vague anchor', post(base, 'Click [here](/pricing).\n')],
    ['seo/link-text', 'bare url anchor', post(base, '[https://acme.dev/x](https://acme.dev/x) and [pricing](/pricing)\n')],
    ['seo/internal-links', 'dead internal link', post(base, 'See [the plan](/nope).\n')],
    ['seo/internal-links', 'dead image', post(base, '![chart](/chart.png) [pricing](/pricing)\n')],
    ['seo/internal-links', 'dead relative link', post(base, 'See [the other](./missing.md) and [pricing](/pricing).\n')],
    ['seo/min-internal-links', 'no internal links', post(base, 'Nothing links anywhere.\n')],
    ['seo/placeholder', 'TODO in prose', post(base, 'TODO finish. [pricing](/pricing)\n')],
    ['seo/placeholder', 'link to #', post(base, '[soon](#) [pricing](/pricing)\n')],
    ['seo/markdown-fence', 'unclosed fence', post(base, '[pricing](/pricing)\n\n```js\nconst a = 1\n')],
  ];

  it.each(cases)('%s fires on: %s', (rule, _label, source) => {
    expect(trip(source)).toContain(rule);
  });

  it('seo/slug fires on a file name with capitals', () => {
    const { root, spec, items } = open({ 'content/blog/2026-01-07-Shouty_Name.md': post({ ...base, title: 'Another perfectly reasonable title', description: `${base.description} Again.` }) });
    const found = lintContent(root, spec, items);
    expect(found.map((d) => d.rule)).toEqual(['seo/slug']);
  });

  it('accepts links to routes, collection pages, assets, anchors and other sites', () => {
    const body = '[home](/) [blog](/blog) [post](/blog/2026-01-05-what-gtm-as-code-means#part) [docs](/docs) ![logo](/logo.png) [map](/sitemap.xml) [top](#top) [ext](https://example.org) [mail](mailto:a@b.co) [sibling](./2026-01-05-what-gtm-as-code-means.md)\n';
    expect(trip(post(base, body))).toEqual([]);
  });

  it('does not treat placeholders inside code as placeholders', () => {
    expect(trip(post(base, 'Use `TODO` markers. [pricing](/pricing)\n\n```sh\n# TODO\n```\n'))).toEqual([]);
  });

  it('does not require dates or internal links on docs', () => {
    const { root, spec, items } = open({ 'content/docs/guide.md': post({ title: 'A guide to something specific', description: base.description }, 'No links here.\n') });
    expect(lintContent(root, spec, items)).toEqual([]);
  });

  it('flags a second page with the same title or description', () => {
    const found = trip(GOOD_POST.replace('2026-01-05', '2026-01-06'));
    expect(found).toEqual(expect.arrayContaining(['seo/unique-title', 'seo/unique-description']));
  });
});

describe('lint: messaging rules', () => {
  it('messaging/avoid reports the line, the term and the reason', () => {
    const { root, spec, items } = open({ [FILE]: post(base, 'We leverage rockets. [pricing](/pricing)\n\nSecond line — with a dash.\n') });
    const found = lintContent(root, spec, items).filter((d) => d.rule === 'messaging/avoid');
    expect(found.map((d) => [d.line, d.message, d.hint])).toEqual([
      [7, '"leverage" in body.', 'Say what the thing does.'],
      [9, '"—" in body.', 'House style.'],
    ]);
    expect(found[0].severity).toBe('warn');
  });

  it('messaging/avoid checks titles and descriptions too', () => {
    const { root, spec, items } = open({ [FILE]: post({ ...base, title: 'How we leverage a reasonable title' }) });
    const found = lintContent(root, spec, items).filter((d) => d.rule === 'messaging/avoid');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ message: '"leverage" in title.', line: 2 });
  });

  it('vocabulary rules read the words, not the URLs', () => {
    const body = 'See [the series](/blog/gtm-as-code-part-one) and https://acme.dev/leverage for more. [pricing](/pricing)\n';
    expect(trip(post(base, body)).filter((rule) => rule.startsWith('messaging/'))).toEqual([]);
    expect(trip(post(base, 'See [GTM-as-code](/pricing).\n'))).toEqual(['messaging/prefer']);
  });

  it('messaging/prefer suggests the spelling the team owns', () => {
    const { root, spec, items } = open({ [FILE]: post(base, 'Marketing as code is fine. [pricing](/pricing)\n') });
    const found = lintContent(root, spec, items).filter((d) => d.rule === 'messaging/prefer');
    expect(found.map((d) => d.message)).toEqual(['"marketing as code" in body. Use "GTM as code".']);
  });

  it('messaging/refs rejects ids that are not in the spec', () => {
    const { root, spec, items } = open({ [FILE]: post({ ...base, persona: 'ghost', topic: 'nope', pillar: 'in-repo' }) });
    const found = lintContent(root, spec, items).filter((d) => d.rule === 'messaging/refs');
    expect(found.map((d) => d.message)).toEqual(['Unknown persona "ghost".', 'Unknown topic "nope".']);
    expect(found[0].hint).toBe('Declared: founder, marketer.');
  });

  it('messaging/topic-keywords wants the topic language up front', () => {
    expect(trip(post({ ...base, topic: 'gtm-as-code' }))).toEqual(['messaging/topic-keywords']);
    expect(trip(post({ ...base, topic: 'gtm-as-code' }, 'Go-to-market as code, briefly. [pricing](/pricing)\n'))).toEqual([]);
  });

  it('messaging/untagged is off until you turn it on', () => {
    expect(trip(post(base))).toEqual([]);
    const { root, spec, items } = open({ 'gtm/gtm.yaml': `${ROOT_YAML}lint:\n  rules:\n    messaging/untagged: error\n`, [FILE]: post(base) });
    expect(lintContent(root, spec, items).map((d) => [d.rule, d.severity])).toEqual([['messaging/untagged', 'error']]);
  });
});

describe('lint: configuration', () => {
  const short = post({ ...base, title: 'Short' });

  it('switches a rule off', () => {
    const { root, spec, items } = open({ 'gtm/gtm.yaml': `${ROOT_YAML}lint:\n  rules:\n    seo/title-length: off\n`, [FILE]: short });
    expect(lintContent(root, spec, items)).toEqual([]);
  });

  it('changes severity and options', () => {
    const { root, spec, items } = open({ 'gtm/gtm.yaml': `${ROOT_YAML}lint:\n  rules:\n    seo/title-length: [error, { min: 3 }]\n`, [FILE]: short });
    expect(lintContent(root, spec, items)).toEqual([]);
    const strict = open({ 'gtm/gtm.yaml': `${ROOT_YAML}lint:\n  rules:\n    seo/title-length: [error, { min: 30 }]\n`, [FILE]: short });
    expect(lintContent(strict.root, strict.spec, strict.items, { only: [FILE] }).map((d) => d.severity)).toEqual(['error']);
  });

  it('applies overrides to matching files only', () => {
    const config = `${ROOT_YAML}lint:\n  overrides:\n    - files: ["content/blog/2026-01-06-*.md"]\n      rules:\n        seo/title-length: off\n`;
    const { root, spec, items } = open({ 'gtm/gtm.yaml': config, [FILE]: short, 'content/blog/2026-01-08-other.md': post({ ...base, title: 'Tiny', description: `${base.description} Other.` }) });
    expect(lintContent(root, spec, items).map((d) => d.file)).toEqual(['content/blog/2026-01-08-other.md']);
  });

  it('reports only the requested files, while still reading the rest for cross-file rules', () => {
    const { root, spec, items } = open({ [FILE]: GOOD_POST.replace('2026-01-05', '2026-01-06') });
    const found = lintContent(root, spec, items, { only: [FILE] });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((d) => d.file === FILE)).toBe(true);
    expect(lintContent(root, spec, items, { only: ['content/docs/index.md'] })).toEqual([]);
  });

  it('skips collections with lint: false', () => {
    const config = ROOT_YAML.replace('      label: Blog\n', '      label: Blog\n      lint: false\n');
    const { root, spec, items } = open({ 'gtm/gtm.yaml': config, [FILE]: short });
    expect(lintContent(root, spec, items)).toEqual([]);
  });
});
