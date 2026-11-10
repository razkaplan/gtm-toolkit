import type { ContentItem } from './content/load';
import type { Spec } from './spec/schema';

export interface QuestionCoverage {
  question: string;
  /** Who asks it: "persona:<id>" or "topic:<id>". */
  askedBy: string;
  /** URLs of published content that lists the question under `answers`. */
  answeredBy: string[];
}

export interface CoverageRow {
  id: string;
  name: string;
  /** Published pieces tagged with this id. */
  items: number;
  /** Date of the newest tagged piece. */
  newest?: string;
}

export interface CoverageReport {
  totals: { published: number; tagged: number; untagged: number };
  personas: CoverageRow[];
  topics: CoverageRow[];
  pillars: CoverageRow[];
  questions: QuestionCoverage[];
  /** Published articles with no topic and no persona. */
  untagged: string[];
}

export function normalizeQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strategy against execution: for every persona, topic, pillar and question in
 * the spec, what has actually been published.
 */
export function coverage(spec: Spec, items: ContentItem[]): CoverageReport {
  const live = items.filter((item) => !item.draft);
  const row = (id: string, name: string, pick: (item: ContentItem) => string[]): CoverageRow => {
    const tagged = live.filter((item) => pick(item).includes(id));
    const newest = tagged
      .map((item) => item.updated ?? item.date)
      .filter((value): value is string => Boolean(value))
      .sort()
      .pop();
    return { id, name, items: tagged.length, newest };
  };

  const answers = new Map<string, string[]>();
  for (const item of live) {
    for (const answer of item.answers) {
      const key = normalizeQuestion(answer);
      answers.set(key, [...(answers.get(key) ?? []), item.url]);
    }
  }

  const questions: QuestionCoverage[] = [];
  const seen = new Set<string>();
  const ask = (question: string, askedBy: string): void => {
    const key = normalizeQuestion(question);
    if (seen.has(key)) return;
    seen.add(key);
    questions.push({ question, askedBy, answeredBy: answers.get(key) ?? [] });
  };
  for (const persona of spec.personas) for (const question of persona.questions) ask(question, `persona:${persona.id}`);
  for (const topic of spec.topics) for (const question of topic.questions) ask(question, `topic:${topic.id}`);

  const articles = live.filter((item) => item.type === 'article');
  const untagged = articles.filter((item) => item.topics.length === 0 && item.personas.length === 0).map((item) => item.file);

  return {
    totals: { published: articles.length, tagged: articles.length - untagged.length, untagged: untagged.length },
    personas: spec.personas.map((persona) => row(persona.id, persona.name, (item) => item.personas)),
    topics: spec.topics.map((topic) => row(topic.id, topic.name, (item) => item.topics)),
    // A piece supports a pillar when it says so, or when one of its topics belongs to that pillar.
    pillars: (spec.messaging?.pillars ?? []).map((pillar) =>
      row(pillar.id, pillar.title, (item) => [
        ...item.pillars,
        ...spec.topics.filter((topic) => topic.pillar && item.topics.includes(topic.id)).map((topic) => topic.pillar as string),
      ]),
    ),
    questions,
    untagged,
  };
}
