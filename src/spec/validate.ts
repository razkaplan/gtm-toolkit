import type { Diagnostic } from '../types';
import { findTerm } from '../content/text';
import type { LoadResult } from './load';
import type { Spec } from './schema';

type Path = Array<string | number>;

export interface SpecRuleDoc {
  id: string;
  severity: 'error' | 'warn';
  description: string;
}

/** Checks `gtm validate` runs once the files match the schema. */
export const SPEC_RULES: SpecRuleDoc[] = [
  { id: 'spec/yaml-syntax', severity: 'error', description: 'A spec file is not valid YAML.' },
  { id: 'spec/schema', severity: 'error', description: 'A value is missing, misspelled or of the wrong type.' },
  { id: 'spec/duplicate-section', severity: 'error', description: 'A section is declared both inline and in its own file.' },
  { id: 'spec/duplicate-id', severity: 'error', description: 'Two personas, pillars, topics, differentiators or competitors share an id.' },
  { id: 'spec/unknown-ref', severity: 'error', description: 'A persona or pillar id is referenced but never declared.' },
  { id: 'spec/collection-path', severity: 'error', description: 'A content collection points at a directory that does not exist.' },
  { id: 'spec/unproven-claim', severity: 'warn', description: 'A pillar or differentiator makes a claim with no proof attached.' },
  { id: 'spec/persona-questions', severity: 'warn', description: 'A persona lists no questions, so there is nothing to answer for them.' },
  { id: 'spec/unused-persona', severity: 'warn', description: 'A persona is declared but no positioning, pillar or topic targets it.' },
  { id: 'spec/length', severity: 'warn', description: 'A one-liner or short boilerplate is too long for the places it gets reused.' },
  { id: 'spec/own-vocabulary', severity: 'warn', description: 'The spec itself uses a term its vocabulary says to avoid.' },
];

const SHORT_LIMIT = 160;

export function validateSpec(loaded: LoadResult, collectionExists: (path: string) => boolean): Diagnostic[] {
  const spec = loaded.spec;
  if (!spec) return loaded.diagnostics;

  const out: Diagnostic[] = [];
  const add = (rule: string, path: Path, message: string, hint?: string): void => {
    const doc = SPEC_RULES.find((entry) => entry.id === rule);
    out.push({ rule, severity: doc?.severity ?? 'error', message, hint, ...loaded.locate(path) });
  };

  const personaIds = new Set(spec.personas.map((persona) => persona.id));
  const pillarIds = new Set((spec.messaging?.pillars ?? []).map((pillar) => pillar.id));

  const duplicates = (items: Array<{ id: string }>, base: Path, noun: string): void => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) add('spec/duplicate-id', [...base, index, 'id'], `Duplicate ${noun} id "${item.id}".`);
      seen.add(item.id);
    });
  };

  duplicates(spec.personas, ['personas'], 'persona');
  duplicates(spec.topics, ['topics'], 'topic');
  duplicates(spec.competitors, ['competitors'], 'competitor');
  duplicates(spec.messaging?.pillars ?? [], ['messaging', 'pillars'], 'pillar');
  duplicates(spec.positioning?.differentiators ?? [], ['positioning', 'differentiators'], 'differentiator');

  const personaRefs = (ids: string[], base: Path): void => {
    ids.forEach((ref, index) => {
      if (!personaIds.has(ref)) {
        add('spec/unknown-ref', [...base, index], `Unknown persona "${ref}".`, known('personas', personaIds));
      }
    });
  };

  personaRefs(spec.positioning?.audience ?? [], ['positioning', 'audience']);
  (spec.messaging?.pillars ?? []).forEach((pillar, index) => {
    personaRefs(pillar.personas, ['messaging', 'pillars', index, 'personas']);
    if (pillar.proof.length === 0) {
      add(
        'spec/unproven-claim',
        ['messaging', 'pillars', index],
        `Pillar "${pillar.id}" has no proof.`,
        'Add a number, a link, a quote or a commit. A claim nobody can check is a slogan.',
      );
    }
  });
  (spec.positioning?.differentiators ?? []).forEach((item, index) => {
    if (item.proof.length === 0) {
      add('spec/unproven-claim', ['positioning', 'differentiators', index], `Differentiator "${item.id}" has no proof.`);
    }
  });
  spec.topics.forEach((topic, index) => {
    personaRefs(topic.personas, ['topics', index, 'personas']);
    if (topic.pillar && !pillarIds.has(topic.pillar)) {
      add('spec/unknown-ref', ['topics', index, 'pillar'], `Unknown pillar "${topic.pillar}".`, known('pillars', pillarIds));
    }
  });

  const targeted = new Set<string>([
    ...(spec.positioning?.audience ?? []),
    ...(spec.messaging?.pillars ?? []).flatMap((pillar) => pillar.personas),
    ...spec.topics.flatMap((topic) => topic.personas),
  ]);
  spec.personas.forEach((persona, index) => {
    if (persona.questions.length === 0) {
      add(
        'spec/persona-questions',
        ['personas', index],
        `Persona "${persona.id}" has no questions.`,
        'List what they ask search engines and assistants. `gtm coverage` turns the list into a content backlog.',
      );
    }
    if (!targeted.has(persona.id)) {
      add('spec/unused-persona', ['personas', index], `Persona "${persona.id}" is not targeted by positioning, a pillar or a topic.`);
    }
  });

  const tooLong = (value: string | undefined, path: Path, label: string): void => {
    if (value && value.length > SHORT_LIMIT) {
      add('spec/length', path, `${label} is ${value.length} characters. Keep it within ${SHORT_LIMIT}.`);
    }
  };
  tooLong(spec.positioning?.oneLiner, ['positioning', 'oneLiner'], 'positioning.oneLiner');
  tooLong(spec.messaging?.boilerplate.short, ['messaging', 'boilerplate', 'short'], 'messaging.boilerplate.short');

  for (const [name, collection] of Object.entries(spec.content.collections)) {
    if (!collectionExists(collection.path)) {
      add('spec/collection-path', ['content', 'collections', name, 'path'], `Collection "${name}" points at "${collection.path}", which does not exist.`);
    }
  }

  for (const entry of ownCopy(spec)) {
    for (const avoid of spec.messaging?.vocabulary.avoid ?? []) {
      if (findTerm(entry.text, avoid.term) >= 0) {
        add('spec/own-vocabulary', entry.path, `${entry.path.join('.')} uses "${avoid.term}", which messaging.vocabulary.avoid rules out.`);
      }
    }
  }

  return out;
}

function known(noun: string, ids: Set<string>): string {
  return ids.size > 0 ? `Declared ${noun}: ${[...ids].join(', ')}.` : `No ${noun} are declared yet.`;
}

/** Every customer-facing sentence in the spec, so the spec can be held to its own rules. */
function ownCopy(spec: Spec): Array<{ path: Path; text: string }> {
  const out: Array<{ path: Path; text: string }> = [{ path: ['site', 'description'], text: spec.site.description }];
  const positioning = spec.positioning;
  if (positioning) {
    out.push({ path: ['positioning', 'oneLiner'], text: positioning.oneLiner });
    out.push({ path: ['positioning', 'problem'], text: positioning.problem });
    if (positioning.tagline) out.push({ path: ['positioning', 'tagline'], text: positioning.tagline });
    positioning.differentiators.forEach((item, index) =>
      out.push({ path: ['positioning', 'differentiators', index, 'claim'], text: item.claim }),
    );
  }
  const messaging = spec.messaging;
  if (messaging) {
    messaging.pillars.forEach((pillar, index) => {
      out.push({ path: ['messaging', 'pillars', index, 'title'], text: pillar.title });
      out.push({ path: ['messaging', 'pillars', index, 'claim'], text: pillar.claim });
    });
    if (messaging.boilerplate.short) out.push({ path: ['messaging', 'boilerplate', 'short'], text: messaging.boilerplate.short });
    if (messaging.boilerplate.medium) out.push({ path: ['messaging', 'boilerplate', 'medium'], text: messaging.boilerplate.medium });
  }
  return out;
}
