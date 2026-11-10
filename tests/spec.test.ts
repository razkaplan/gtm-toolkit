import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRuleConfig } from '../src/lint';
import { loadSpec } from '../src/spec/load';
import { validateSpec } from '../src/spec/validate';
import { MESSAGING_YAML, PERSONAS_YAML, ROOT_YAML, TOPICS_YAML, open, project } from './helpers';

const validate = (files: Record<string, string>) => {
  const root = project(files);
  const loaded = loadSpec({ cwd: root });
  return validateSpec(loaded, (path) => existsSync(join(root, path)));
};
const rules = (files: Record<string, string>) => validate(files).map((d) => d.rule);

describe('loadSpec', () => {
  it('merges the root file with the section files next to it', () => {
    const { spec, loaded } = open();
    expect(spec.site.name).toBe('Acme');
    expect(spec.personas.map((p) => p.id)).toEqual(['founder', 'marketer']);
    expect(spec.messaging?.pillars[0].id).toBe('in-repo');
    expect(loaded.files).toEqual(['gtm/gtm.yaml', 'gtm/personas.yaml', 'gtm/messaging.yaml', 'gtm/topics.yaml']);
  });

  it('applies defaults so every later stage can rely on them', () => {
    const { spec } = open();
    expect(spec.crawlers.ai).toEqual({ training: 'allow', search: 'allow', user: 'allow' });
    expect(spec.outputs.robots).toBe('public/robots.txt');
    expect(spec.outputs.schema).toBe(false);
    expect(spec.content.collections.blog.include).toBe('**/*.{md,mdx}');
  });

  it('finds the project root from a nested directory', () => {
    const root = project();
    expect(loadSpec({ cwd: join(root, 'content', 'blog') }).root).toBe(root);
  });

  it('reports a missing spec without throwing', () => {
    const result = loadSpec({ cwd: '/' });
    expect(result.spec).toBeUndefined();
    expect(result.diagnostics[0].rule).toBe('spec/not-found');
  });

  it('points a YAML syntax error at its line', () => {
    const result = loadSpec({ cwd: project({ 'gtm/personas.yaml': '- id: founder\n  name: "unterminated\n' }) });
    expect(result.spec).toBeUndefined();
    expect(result.diagnostics[0]).toMatchObject({ rule: 'spec/yaml-syntax', file: 'gtm/personas.yaml' });
    expect(result.diagnostics[0].line).toBeGreaterThan(0);
  });

  it('points a schema error at the file and line that caused it', () => {
    const result = loadSpec({ cwd: project({ 'gtm/personas.yaml': '- id: founder\n  name: Founder\n- id: Bad Id\n  name: Other\n' }) });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({ rule: 'spec/schema', file: 'gtm/personas.yaml', line: 3 });
    expect(result.diagnostics[0].message).toContain('personas.1.id');
  });

  it('names unknown keys and required fields in plain words', () => {
    const result = loadSpec({ cwd: project({ 'gtm/positioning.yaml': 'categry: Tools\noneLiner: A tool.\nproblem: Hard.\n' }) });
    const messages = result.diagnostics.map((d) => d.message);
    expect(messages).toContain('positioning: unknown key "categry"');
    expect(messages).toContain('positioning.category: is required');
  });

  it('rejects a section declared both inline and in its own file', () => {
    const result = loadSpec({ cwd: project({ 'gtm/gtm.yaml': `${ROOT_YAML}personas: []\n` }) });
    expect(result.diagnostics.map((d) => d.rule)).toContain('spec/duplicate-section');
  });

  it('rejects a site url with a path, because every generated URL is built on it', () => {
    const result = loadSpec({ cwd: project({ 'gtm/gtm.yaml': ROOT_YAML.replace('https://www.acme.dev', 'https://www.acme.dev/') }) });
    expect(result.diagnostics[0].message).toContain('site.url');
  });
});

describe('validateSpec', () => {
  it('passes the fixture cleanly', () => {
    expect(validate({})).toEqual([]);
  });

  it('flags references to personas and pillars that do not exist', () => {
    const found = validate({ 'gtm/topics.yaml': TOPICS_YAML.replace('pillar: in-repo', 'pillar: nope').replace('[founder, marketer]', '[founder, ghost]') });
    const errors = found.filter((d) => d.rule === 'spec/unknown-ref');
    expect(errors.map((d) => d.message)).toEqual(['Unknown persona "ghost".', 'Unknown pillar "nope".']);
    expect(errors.every((d) => d.severity === 'error' && d.file === 'gtm/topics.yaml')).toBe(true);
  });

  it('flags duplicate ids', () => {
    expect(rules({ 'gtm/personas.yaml': `${PERSONAS_YAML}- id: founder\n  name: Again\n  questions: [x]\n` })).toContain('spec/duplicate-id');
  });

  it('warns about a claim with no proof', () => {
    const found = validate({ 'gtm/messaging.yaml': MESSAGING_YAML.replace(/    proof:\n      - .*\n/, '') });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: 'spec/unproven-claim', severity: 'warn' });
  });

  it('warns about personas nobody targets and personas with no questions', () => {
    const found = rules({ 'gtm/personas.yaml': `${PERSONAS_YAML}- id: lurker\n  name: Lurker\n` });
    expect(found).toEqual(expect.arrayContaining(['spec/persona-questions', 'spec/unused-persona']));
  });

  it('holds the spec to its own vocabulary', () => {
    const found = validate({ 'gtm/messaging.yaml': MESSAGING_YAML.replace('Positioning belongs next', 'Leverage positioning next') });
    expect(found.map((d) => d.rule)).toEqual(['spec/own-vocabulary']);
  });

  it('flags a collection whose folder is missing', () => {
    expect(rules({ 'gtm/gtm.yaml': ROOT_YAML.replace('path: content/docs', 'path: content/nope') })).toContain('spec/collection-path');
  });

  it('flags a one-liner too long to reuse', () => {
    const long = 'x'.repeat(161);
    expect(rules({ 'gtm/positioning.yaml': `category: Tools\noneLiner: ${long}\nproblem: Hard.\n` })).toContain('spec/length');
  });

  it('flags lint config that names a rule that does not exist', () => {
    const loaded = loadSpec({ cwd: project({ 'gtm/gtm.yaml': `${ROOT_YAML}lint:\n  rules:\n    seo/nope: off\n` }) });
    const found = checkRuleConfig(loaded);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: 'spec/unknown-rule', file: 'gtm/gtm.yaml' });
  });
});
