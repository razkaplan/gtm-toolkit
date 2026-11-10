import { z } from 'zod';

/**
 * The GTM spec. Everything a team (and its agents) needs to know about how a
 * product goes to market, in a shape a machine can validate.
 *
 * `gtm/gtm.yaml` holds the root. Each strategy section may live inline under
 * its key or in a sibling file named after it (`gtm/positioning.yaml`, ...).
 */

const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'ids are lowercase kebab-case, for example "technical-founder"');

const text = z.string().trim().min(1, 'must not be empty');

const policy = z.enum(['allow', 'disallow']);

const severity = z.enum(['error', 'warn', 'off']);

const ruleSetting = z.union([severity, z.tuple([severity, z.record(z.string(), z.unknown())])]);

const rulesMap = z.record(z.string(), ruleSetting);

export const siteSchema = z.strictObject({
  name: text.describe('The name people and machines should use for this site, product or person.'),
  url: z
    .string()
    .regex(/^https?:\/\/[^\s/]+$/, 'must be an origin such as "https://www.example.dev", with no path or trailing slash')
    .describe('Canonical origin. Every generated URL is built on it.'),
  description: text.describe('One or two sentences. Used in llms.txt, structured data and GTM.md.'),
  language: z.string().default('en').describe('BCP 47 language tag.'),
});

export const ownerSchema = z.strictObject({
  type: z.enum(['person', 'organization']).describe('Drives the schema.org type in structured data.'),
  name: text.describe('The person or organization behind the site.'),
  url: z.url().optional().describe('Their canonical page. Defaults to site.url.'),
  jobTitle: z.string().optional().describe('For a person.'),
  description: z.string().optional().describe('One or two sentences about them.'),
  sameAs: z.array(z.url()).default([]).describe('Profiles that are the same entity: LinkedIn, GitHub, X.'),
});

export const collectionSchema = z.strictObject({
  path: text.describe('Directory that holds the files, relative to the project root.'),
  include: z.string().default('**/*.{md,mdx}').describe('Glob, relative to path.'),
  url: z
    .string()
    .regex(/\{(slug|path)\}/, 'must contain {slug} (file name without extension) or {path} (relative path without extension)')
    .describe('URL pattern, for example "/blog/{slug}". An index file maps to its folder.'),
  type: z.enum(['article', 'doc', 'page']).default('article').describe('Articles are dated; docs and pages are not.'),
  label: z.string().optional().describe('Section heading in llms.txt. Defaults to the collection key.'),
  sitemap: z.boolean().default(true).describe('List these pages in sitemap.xml.'),
  llms: z.boolean().default(true).describe('List these pages in llms.txt.'),
  lint: z.boolean().default(true).describe('Run `gtm lint` on these files.'),
});

export const routeSchema = z.union([
  z.string().regex(/^\//, 'routes start with "/"'),
  z.strictObject({
    path: z.string().regex(/^\//, 'routes start with "/"').describe('The URL path, starting with "/".'),
    title: z.string().optional().describe('Link text in llms.txt. A route with no title is left out of it.'),
    description: z.string().optional().describe('The sentence after the link in llms.txt.'),
    lastmod: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD').optional().describe('Date for the sitemap. A route that lists a collection is dated by its newest item.'),
    sitemap: z.boolean().default(true).describe('List this route in sitemap.xml.'),
    llms: z.boolean().default(true).describe('List this route in llms.txt.'),
  }),
]);

export const contentSchema = z.strictObject({
  publicDir: z.string().default('public').describe('Where static assets live. Used to resolve links to files.'),
  collections: z.record(id, collectionSchema).default({}).describe('Folders of markdown that become pages, keyed by a name you choose.'),
  routes: z.array(routeSchema).default([]).describe('Pages that are not backed by a markdown file.'),
});

export const crawlersSchema = z.strictObject({
  disallow: z.array(z.string().regex(/^\//, 'paths start with "/"')).default([]).describe('Paths no crawler may fetch.'),
  ai: z
    .strictObject({
      training: policy.default('allow').describe('Crawlers that collect data to train models.'),
      search: policy.default('allow').describe('Crawlers that build AI search indexes.'),
      user: policy.default('allow').describe('Fetchers acting for a person inside an assistant.'),
    })
    .prefault({}),
  agents: z
    .record(z.string(), policy)
    .default({})
    .describe('Per user-agent override, for example { Bytespider: disallow }.'),
});

export const outputsSchema = z.strictObject({
  robots: z.union([z.string(), z.literal(false)]).default('public/robots.txt').describe('Where to write robots.txt, or false to skip it.'),
  sitemap: z.union([z.string(), z.literal(false)]).default('public/sitemap.xml').describe('Where to write sitemap.xml, or false to skip it.'),
  llms: z.union([z.string(), z.literal(false)]).default('public/llms.txt').describe('Where to write llms.txt, or false to skip it.'),
  context: z.union([z.string(), z.literal(false)]).default('GTM.md').describe('The brief for coding agents and new teammates.'),
  schema: z.union([z.string(), z.literal(false)]).default(false).describe('schema.org JSON-LD graph as a JSON file.'),
});

export const lintSchema = z.strictObject({
  rules: rulesMap.default({}).describe('Rule id to "error", "warn", "off" or [severity, options].'),
  ignore: z.array(z.string()).default([]).describe('Globs of content files to skip.'),
  overrides: z
    .array(z.strictObject({ files: z.array(z.string()).min(1), rules: rulesMap }))
    .default([])
    .describe('Different settings for some files. Later entries win.'),
});

const proof = z.array(text).default([]).describe('Evidence: a number, a link, a named customer, a commit.');

export const positioningSchema = z.strictObject({
  category: text.describe('The market category you want to be filed under.'),
  oneLiner: text.describe('What it is and who it is for, in one sentence.'),
  tagline: z.string().optional().describe('A short line for headers and social cards.'),
  problem: text.describe('The problem, in the words of the people who have it.'),
  audience: z.array(id).default([]).describe('Persona ids, most important first.'),
  differentiators: z
    .array(z.strictObject({ id, claim: text.describe('The difference, stated plainly.'), proof }))
    .default([])
    .describe('Why you, and not the alternative.'),
  notThis: z
    .array(text)
    .default([])
    .describe('What you are not. Disambiguation that people and language models both need.'),
});

export const personaSchema = z.strictObject({
  id: id.describe('Stable id. Content refers to it with `persona:` in frontmatter.'),
  name: text.describe('What the team calls this reader.'),
  role: z.string().optional().describe('Job title or situation.'),
  description: z.string().optional().describe('A sentence or two of context.'),
  jobs: z.array(text).default([]).describe('Jobs to be done.'),
  pains: z.array(text).default([]).describe('What makes those jobs hard today.'),
  triggers: z.array(text).default([]).describe('Events that make them look for a solution.'),
  questions: z
    .array(text)
    .default([])
    .describe('Questions they type into search or ask an assistant. Each one is a content brief.'),
});

export const messagingSchema = z.strictObject({
  pillars: z
    .array(
      z.strictObject({
        id: id.describe('Stable id. Content refers to it with `pillar:` in frontmatter.'),
        title: text.describe('The pillar as a headline.'),
        claim: text.describe('The argument, in a sentence or two.'),
        proof,
        personas: z.array(id).default([]).describe('Persona ids this pillar speaks to.'),
      }),
    )
    .default([]),
  boilerplate: z
    .strictObject({
      short: z.string().optional().describe('Up to 160 characters. Meta descriptions and bios.'),
      medium: z.string().optional().describe('A paragraph. About sections and press.'),
    })
    .prefault({}),
  vocabulary: z
    .strictObject({
      prefer: z
        .array(
          z.strictObject({
            term: text.describe('The spelling you own.'),
            insteadOf: z.array(text).min(1).describe('Variants `gtm lint` should flag.'),
            reason: z.string().optional().describe('Shown next to the finding.'),
          }),
        )
        .default([]),
      avoid: z
        .array(
          z.strictObject({
            term: text.describe('A word or phrase, matched case-insensitively on word boundaries.'),
            reason: z.string().optional().describe('Shown next to the finding.'),
          }),
        )
        .default([]),
    })
    .prefault({}),
  voice: z.array(text).default([]).describe('Plain-language writing guidance. Compiled into GTM.md.'),
});

export const topicSchema = z.strictObject({
  id: id.describe('Stable id. Content refers to it with `topic:` in frontmatter.'),
  name: text.describe('The topic as readers would name it.'),
  description: z.string().optional().describe('What the topic covers.'),
  pillar: id.optional().describe('The messaging pillar this topic supports.'),
  personas: z.array(id).default([]).describe('Persona ids who care about it.'),
  keywords: z.array(text).default([]).describe('Phrases a piece on this topic is expected to use.'),
  questions: z.array(text).default([]).describe('Questions the topic should answer. Counted by `gtm coverage`.'),
});

export const competitorSchema = z.strictObject({
  id: id.describe('Stable id.'),
  name: text.describe('The alternative, by name.'),
  url: z.url().optional().describe('Their site.'),
  kind: z.enum(['direct', 'adjacent', 'status-quo']).default('direct').describe('direct: same job, same buyer. adjacent: overlapping job. status-quo: what people do without a product.'),
  summary: text.describe('What they are, stated fairly.'),
  weDiffer: text.describe('The honest difference. This is what agents will repeat.'),
});

export const specSchema = z.strictObject({
  version: z.literal(2, { error: 'this toolkit reads spec version 2' }).describe('Spec format version. Always 2.'),
  site: siteSchema,
  owner: ownerSchema.optional(),
  content: contentSchema.prefault({}),
  crawlers: crawlersSchema.prefault({}),
  outputs: outputsSchema.prefault({}),
  lint: lintSchema.prefault({}),
  positioning: positioningSchema.optional(),
  personas: z.array(personaSchema).default([]),
  messaging: messagingSchema.optional(),
  topics: z.array(topicSchema).default([]),
  competitors: z.array(competitorSchema).default([]),
});

export type Spec = z.infer<typeof specSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Positioning = z.infer<typeof positioningSchema>;
export type Messaging = z.infer<typeof messagingSchema>;
export type Competitor = z.infer<typeof competitorSchema>;
export type Policy = z.infer<typeof policy>;
export type RuleSetting = z.infer<typeof ruleSetting>;
export type Severity = z.infer<typeof severity>;

/** Sections that may live in their own file next to gtm.yaml. */
export const SECTION_FILES = ['positioning', 'personas', 'messaging', 'topics', 'competitors'] as const;
export type SectionName = (typeof SECTION_FILES)[number];

export const sectionSchemas = {
  positioning: positioningSchema,
  personas: z.array(personaSchema),
  messaging: messagingSchema,
  topics: z.array(topicSchema),
  competitors: z.array(competitorSchema),
} as const;
