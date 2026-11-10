import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { coverage } from '../src/coverage';
import { changedFiles, diffSpecs, impactOf, specAtRef } from '../src/diff';
import { loadSpec } from '../src/spec/load';
import { PERSONAS_YAML, ROOT_YAML, TOPICS_YAML, open, post, project } from './helpers';

describe('coverage', () => {
  it('counts published content per persona, topic and pillar', () => {
    const { spec, items } = open({
      'content/blog/2026-02-01-untagged.md': post({ title: 'An article with no tags at all', description: 'x'.repeat(80), date: '2026-02-01' }),
      'content/blog/2026-02-02-draft.md': post({ title: 'A draft for the marketer persona', description: 'y'.repeat(80), date: '2026-02-02', persona: 'marketer', draft: true }),
    });
    const report = coverage(spec, items);
    expect(report.totals).toEqual({ published: 2, tagged: 1, untagged: 1 });
    expect(report.personas).toEqual([
      { id: 'founder', name: 'Technical founder', items: 1, newest: '2026-01-05' },
      { id: 'marketer', name: 'Product marketer', items: 0, newest: undefined },
    ]);
    expect(report.topics[0]).toMatchObject({ id: 'gtm-as-code', items: 1 });
    expect(report.pillars[0]).toMatchObject({ id: 'in-repo', items: 0 });
    expect(report.untagged).toEqual(['content/blog/2026-02-01-untagged.md']);
  });

  it('matches answers to questions regardless of case and punctuation', () => {
    const { spec, items } = open({
      'content/blog/2026-02-03-answer.md': post({ title: 'An article that answers a question', description: 'z'.repeat(80), date: '2026-02-03', answers: ['what is gtm as code'] }),
    });
    const questions = coverage(spec, items).questions;
    expect(questions).toHaveLength(3);
    expect(questions.find((q) => q.question === 'What is GTM as code?')).toMatchObject({ askedBy: 'persona:founder', answeredBy: ['/blog/2026-02-03-answer'] });
    expect(questions.filter((q) => q.answeredBy.length === 0).map((q) => q.askedBy)).toEqual(['persona:marketer', 'topic:gtm-as-code']);
  });
});

describe('diff', () => {
  const before = open().spec;

  it('describes strategy changes by id, not by line', () => {
    const after = open({
      'gtm/personas.yaml': PERSONAS_YAML.replace('Technical founder', 'Founder').replace('    - "What is GTM as code?"\n', '    - "What is GTM as code?"\n    - "Is it worth it?"\n'),
      'gtm/gtm.yaml': `${ROOT_YAML}crawlers:\n  ai:\n    training: disallow\n`,
    }).spec;
    expect(diffSpecs(before, after)).toEqual([
      { path: 'crawlers.ai.training', kind: 'changed', before: 'allow', after: 'disallow' },
      { path: 'personas[founder].name', kind: 'changed', before: 'Technical founder', after: 'Founder' },
      { path: 'personas[founder].questions', kind: 'added', after: 'Is it worth it?' },
    ]);
  });

  it('reports nothing when nothing changed', () => {
    expect(diffSpecs(before, open().spec)).toEqual([]);
  });

  it('finds content stranded by a removed id', () => {
    const { spec, items } = open({ 'gtm/topics.yaml': TOPICS_YAML.replace('id: gtm-as-code', 'id: renamed') });
    const changes = diffSpecs(before, spec);
    expect(changes.map((c) => [c.kind, c.path])).toEqual([
      ['removed', 'topics[gtm-as-code]'],
      ['added', 'topics[renamed]'],
    ]);
    expect(impactOf(changes, items)).toEqual([{ removed: 'topic:gtm-as-code', files: ['content/blog/2026-01-05-what-gtm-as-code-means.md'] }]);
  });

  it('reads the spec at a git ref and lists changed files', () => {
    const root = project();
    const git = (...args: string[]) => execFileSync('git', ['-c', 'user.email=t@t.co', '-c', 'user.name=t', ...args], { cwd: root, stdio: 'pipe' });
    git('init', '-q');
    git('add', '-A');
    git('commit', '-qm', 'init');
    writeFileSync(join(root, 'gtm/personas.yaml'), PERSONAS_YAML.replace('Product marketer', 'PMM'));
    writeFileSync(join(root, 'content/blog/2026-02-09-new.md'), post({ title: 'new' }));

    const old = specAtRef(root, 'HEAD');
    const now = loadSpec({ cwd: root }).spec;
    expect(old?.personas[1].name).toBe('Product marketer');
    expect(now && old && diffSpecs(old, now)).toEqual([{ path: 'personas[marketer].name', kind: 'changed', before: 'Product marketer', after: 'PMM' }]);
    expect(changedFiles(root, 'HEAD').sort()).toEqual(['content/blog/2026-02-09-new.md', 'gtm/personas.yaml']);
    expect(() => specAtRef(root, 'no-such-ref')).toThrow(/git could not read "no-such-ref"/);
  });
});
