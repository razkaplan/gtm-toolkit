import { findTerm, opening, termPattern } from '../../content/text';
import type { ContentItem } from '../../content/load';
import type { FileRule, Report, Rule } from '../types';

/** Title, description and every prose line, with the line each one sits on. */
function copyLines(item: ContentItem): Array<{ text: string; line?: number; where: string }> {
  const rows: Array<{ text: string; line?: number; where: string }> = [];
  if (item.title) rows.push({ text: item.title, line: item.keyLines.title, where: 'title' });
  if (item.description) {
    rows.push({
      text: item.description,
      line: item.descriptionKey ? item.keyLines[item.descriptionKey] : undefined,
      where: item.descriptionKey ?? 'description',
    });
  }
  for (const row of item.scanned.prose) rows.push({ text: row.copy, line: row.line, where: 'body' });
  return rows;
}

function scan(item: ContentItem, term: string, make: (where: string) => Omit<Report, 'line' | 'column'>, report: (r: Report) => void): void {
  const pattern = termPattern(term);
  for (const row of copyLines(item)) {
    pattern.lastIndex = 0;
    const match = pattern.exec(row.text);
    if (match) report({ ...make(row.where), line: row.line, column: row.where === 'body' ? match.index + 1 : undefined });
  }
}

const avoid: FileRule = {
  id: 'messaging/avoid',
  scope: 'file',
  description: 'Content does not use terms the messaging spec rules out.',
  rationale: 'Every team has words it decided not to use: a competitor\'s framing, a retired product name, a house style rule. Writing them down once in messaging.vocabulary.avoid means people and agents both get corrected before review, not during it.',
  defaultSeverity: 'warn',
  defaultOptions: {},
  check({ spec, item, report }) {
    for (const entry of spec.messaging?.vocabulary.avoid ?? []) {
      scan(
        item,
        entry.term,
        (where) => ({ message: `"${entry.term}" in ${where}.`, hint: entry.reason }),
        report,
      );
    }
  },
};

const prefer: FileRule = {
  id: 'messaging/prefer',
  scope: 'file',
  description: 'Content uses the preferred spelling of the terms the team owns.',
  rationale: 'If the site says "GTM as code", "GTM-as-Code" and "go to market as code", search engines and language models see three weak terms instead of one strong one. Consistency is how a phrase becomes yours.',
  defaultSeverity: 'warn',
  defaultOptions: {},
  check({ spec, item, report }) {
    for (const entry of spec.messaging?.vocabulary.prefer ?? []) {
      for (const variant of entry.insteadOf) {
        scan(
          item,
          variant,
          (where) => ({ message: `"${variant}" in ${where}. Use "${entry.term}".`, hint: entry.reason }),
          report,
        );
      }
    }
  },
};

const refs: FileRule = {
  id: 'messaging/refs',
  scope: 'file',
  description: 'Frontmatter personas, topics and pillars exist in the spec.',
  rationale: 'Tagging a post with a persona that was renamed last quarter quietly removes it from every coverage report. References are checked like imports.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ spec, item, report }) {
    const check = (values: string[], known: string[], noun: string, key: string): void => {
      for (const value of values) {
        if (!known.includes(value)) {
          report({
            message: `Unknown ${noun} "${value}".`,
            line: item.keyLines[key] ?? item.keyLines[`${key}s`],
            hint: known.length > 0 ? `Declared: ${known.join(', ')}.` : `No ${noun}s are declared in the spec.`,
          });
        }
      }
    };
    check(item.personas, spec.personas.map((persona) => persona.id), 'persona', 'persona');
    check(item.topics, spec.topics.map((topic) => topic.id), 'topic', 'topic');
    check(item.pillars, (spec.messaging?.pillars ?? []).map((pillar) => pillar.id), 'pillar', 'pillar');
  },
};

const topicKeywords: FileRule<{ words: number }> = {
  id: 'messaging/topic-keywords',
  scope: 'file',
  description: 'A page tagged with a topic uses that topic\'s language up front.',
  rationale: 'The topic file is the keyword source of truth. If a page claims a topic but its title, description and opening never use one of the topic\'s phrases, either the tag or the page is wrong.',
  defaultSeverity: 'warn',
  defaultOptions: { words: 150 },
  check({ spec, item, options, report }) {
    if (item.topics.length === 0) return;
    const haystack = [item.title ?? '', item.description ?? '', opening(item.scanned, options.words)].join('\n');
    for (const id of item.topics) {
      const topic = spec.topics.find((entry) => entry.id === id);
      if (!topic || topic.keywords.length === 0) continue;
      if (!topic.keywords.some((keyword) => findTerm(haystack, keyword) >= 0)) {
        report({
          message: `Tagged "${id}" but the title, description and first ${options.words} words use none of its keywords.`,
          line: item.keyLines.topic ?? item.keyLines.topics,
          hint: `Keywords: ${topic.keywords.join(', ')}.`,
        });
      }
    }
  },
};

const untagged: FileRule = {
  id: 'messaging/untagged',
  scope: 'file',
  description: 'Articles declare the topic or persona they serve.',
  rationale: 'Content with no topic and no persona cannot be counted in `gtm coverage`. Off by default, because a new spec starts with a backlog of untagged posts; turn it on once the backlog is cleared.',
  defaultSeverity: 'off',
  defaultOptions: {},
  appliesTo: ['article'],
  check({ item, report }) {
    if (item.topics.length === 0 && item.personas.length === 0) {
      report({ message: 'No `topic` or `persona` in frontmatter.', line: 1 });
    }
  },
};

export const messagingRules: Rule[] = [avoid, prefer, refs, topicKeywords, untagged];
