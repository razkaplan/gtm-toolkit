import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import picomatch from 'picomatch';
import type { ContentItem } from '../content/load';
import type { LoadResult } from '../spec/load';
import type { RuleSetting, Severity, Spec } from '../spec/schema';
import { sortDiagnostics, type Diagnostic } from '../types';
import { messagingRules } from './rules/messaging';
import { seoRules } from './rules/seo';
import type { Rule, SiteIndex } from './types';

export const RULES: Rule[] = [...seoRules, ...messagingRules];

export function getRule(id: string): Rule | undefined {
  return RULES.find((rule) => rule.id === id);
}

interface Resolved {
  severity: Severity;
  options: Record<string, unknown>;
}

function apply(current: Resolved, setting: RuleSetting | undefined): Resolved {
  if (setting === undefined) return current;
  if (typeof setting === 'string') return { ...current, severity: setting };
  return { severity: setting[0], options: { ...current.options, ...setting[1] } };
}

/** Defaults, then lint.rules, then every matching override in order. */
export function resolveRule(spec: Spec, rule: Rule, file: string): Resolved {
  let resolved: Resolved = { severity: rule.defaultSeverity, options: { ...(rule.defaultOptions as Record<string, unknown>) } };
  resolved = apply(resolved, spec.lint.rules[rule.id]);
  for (const override of spec.lint.overrides) {
    if (picomatch(override.files)(file)) resolved = apply(resolved, override.rules[rule.id]);
  }
  return resolved;
}

/** Rule ids in the config that do not exist. Reported by `gtm validate`. */
export function checkRuleConfig(loaded: LoadResult): Diagnostic[] {
  const spec = loaded.spec;
  if (!spec) return [];
  const out: Diagnostic[] = [];
  const known = new Set(RULES.map((rule) => rule.id));
  const check = (rules: Record<string, RuleSetting>, base: Array<string | number>): void => {
    for (const id of Object.keys(rules)) {
      if (!known.has(id)) {
        out.push({
          rule: 'spec/unknown-rule',
          severity: 'error',
          message: `Unknown lint rule "${id}".`,
          hint: 'Run `gtm rules` to list them.',
          ...loaded.locate([...base, id]),
        });
      }
    }
  };
  check(spec.lint.rules, ['lint', 'rules']);
  spec.lint.overrides.forEach((override, index) => check(override.rules, ['lint', 'overrides', index, 'rules']));
  return out;
}

export function buildSiteIndex(root: string, spec: Spec, items: ContentItem[]): SiteIndex {
  const urls = new Set<string>(items.map((item) => item.url));
  for (const route of spec.content.routes) urls.add(typeof route === 'string' ? route : route.path);
  urls.add('/');

  const publicDir = spec.content.publicDir.replace(/\/$/, '');
  const generated = new Set<string>();
  for (const output of [spec.outputs.robots, spec.outputs.sitemap, spec.outputs.llms]) {
    if (typeof output !== 'string') continue;
    const normalized = posix.normalize(output);
    if (normalized.startsWith(`${publicDir}/`)) generated.add(normalized.slice(publicDir.length));
  }

  return {
    urls,
    hasAsset: (path) => generated.has(path) || existsSync(join(root, publicDir, decodeURIComponent(path))),
    hasFile: (file) => existsSync(join(root, file)),
  };
}

export interface LintOptions {
  /** Only report on these files (relative to root). All content is still read, so cross-file rules stay correct. */
  only?: string[];
}

export function lintContent(root: string, spec: Spec, items: ContentItem[], options: LintOptions = {}): Diagnostic[] {
  const site = buildSiteIndex(root, spec, items);
  const lintable = items.filter((item) => spec.content.collections[item.collection]?.lint !== false);
  const only = options.only ? new Set(options.only) : undefined;
  const out: Diagnostic[] = [];

  for (const rule of RULES) {
    if (rule.scope === 'file') {
      for (const item of lintable) {
        if (only && !only.has(item.file)) continue;
        if (rule.appliesTo && !rule.appliesTo.includes(item.type)) continue;
        const { severity, options: ruleOptions } = resolveRule(spec, rule, item.file);
        if (severity === 'off') continue;
        rule.check({
          spec,
          item,
          site,
          options: ruleOptions,
          report: (finding) => out.push({ rule: rule.id, severity, file: item.file, ...finding }),
        });
      }
    } else {
      const enabled = new Map<string, Severity>();
      for (const item of lintable) enabled.set(item.file, resolveRule(spec, rule, item.file).severity);
      rule.check({
        spec,
        items: lintable,
        options: resolveRule(spec, rule, '').options,
        enabledFor: (item) => enabled.get(item.file) !== 'off',
        report: (item, finding) => {
          const severity = enabled.get(item.file) ?? 'off';
          if (severity === 'off' || (only && !only.has(item.file))) return;
          out.push({ rule: rule.id, severity, file: item.file, ...finding });
        },
      });
    }
  }

  return sortDiagnostics(out);
}
