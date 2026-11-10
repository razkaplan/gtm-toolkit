# GTM Toolkit

Go-to-market as code. Declare your positioning, personas, messaging and topics in the repo, check your content against them in CI, and compile the result for the three audiences every page now has: people, search engines and AI models.

```bash
npm install --save-dev gtm-toolkit
npx gtm init
```

Created and maintained by [Raz Kaplan](https://www.gtmascode.dev). Docs: [gtmascode.dev/docs](https://www.gtmascode.dev/docs).

## The idea

Engineering teams stopped keeping the truth in slide decks a long time ago. The schema is in the repo, a change is a pull request, and CI refuses to merge what breaks the contract.

Go-to-market strategy still lives in decks, wikis and somebody's head. That was survivable when people wrote all the copy. It is not survivable when coding agents write landing pages, docs and changelogs at the speed of a commit, with no idea who you sell to or which words you retired last quarter.

GTM Toolkit gives strategy the same treatment as code:

1. **Declare it.** A `gtm/` directory of small YAML files: who you are for, what you claim, how you prove it, the words you use and the ones you do not.
2. **Check it.** `gtm validate` checks the strategy itself (a claim with no proof is a warning). `gtm lint` checks every page against it.
3. **Compile it.** `gtm build` writes `robots.txt`, `sitemap.xml`, `llms.txt`, structured data and `GTM.md`, a brief your coding agents read before they write a word.
4. **Keep it true.** `gtm check` runs all of it in CI and fails when a generated file has drifted from its source.

## A two-minute tour

```console
$ npx gtm init
  created  gtm/gtm.yaml
  created  gtm/positioning.yaml
  created  gtm/personas.yaml
  created  gtm/messaging.yaml
  created  gtm/topics.yaml
  created  gtm/competitors.yaml
```

Write down a decision. Here, a term the team stopped using and a spelling it wants to own:

```yaml
# gtm/messaging.yaml
vocabulary:
  prefer:
    - term: "GTM as code"
      insteadOf: ["GTM-as-code", "marketing as code"]
  avoid:
    - term: "leverage"
      reason: "Say what the thing does."
```

Now every page is held to it, with a file, a line and the reason:

```console
$ npx gtm lint
content/blog/2026-01-06-launch.md
  1:1   error  Missing `description` in frontmatter.  seo/description
  8:7   error  Link target /pricing-old does not exist.  seo/internal-links
  12:4  warn   "leverage" in body.  messaging/avoid
               Say what the thing does.
  19:1  warn   "marketing as code" in body. Use "GTM as code".  messaging/prefer

✖ 4 problems (2 errors, 2 warnings)
```

Compile the spec, then let CI guard it:

```console
$ npx gtm build
  created       public/robots.txt
  created       public/sitemap.xml
  created       public/llms.txt
  created       GTM.md

$ npx gtm check
✓ validate   ok
✓ lint       ok
✓ build      ok
✓ No problems
```

## The spec

`gtm/gtm.yaml` is the root. Each strategy section sits in its own file next to it, or inline under the same key.

| File | What it declares |
| --- | --- |
| `gtm.yaml` | The site, its owner, content collections, routes, crawler policy, outputs, lint settings |
| `positioning.yaml` | Category, one-liner, problem, audience, differentiators with proof, and what you are not |
| `personas.yaml` | Who you write for: jobs, pains, triggers, and the questions they ask search engines and assistants |
| `messaging.yaml` | Pillars with proof, boilerplate, vocabulary to prefer and to avoid, voice |
| `topics.yaml` | What you want to be found for: keywords and questions per topic |
| `competitors.yaml` | The alternatives, stated fairly, and the honest difference |

Every file has a JSON Schema in `schemas/`, so editors that speak `yaml-language-server` autocomplete and validate as you type. `gtm init` adds the modeline for you.

Content joins the strategy through frontmatter:

```yaml
---
title: What GTM as code means for a small team
description: What goes in the repo, what gets checked, and what a small team gets back.
date: 2026-01-05
topic: gtm-as-code      # an id from topics.yaml
persona: founder        # an id from personas.yaml
answers:
  - "What is GTM as code?"   # a question from a persona or topic
---
```

## Commands

| Command | What it does |
| --- | --- |
| `gtm init` | Scaffold a `gtm/` spec. Detects your content folders. Never overwrites a file. |
| `gtm validate` | Check the spec: schema, references between files, claims without proof. |
| `gtm lint [paths...]` | Check content against the spec. `--changed [base]` for pull requests, `--format github` for inline annotations. |
| `gtm build` | Write the generated files. `--check` writes nothing and exits 1 on drift. `--dry-run` shows the plan. |
| `gtm check` | `validate` + `lint` + `build --check` in one pass. The command for CI. |
| `gtm coverage` | Strategy against execution: published content per persona, topic, pillar and question. |
| `gtm diff [base]` | What changed in the strategy since a git ref, and which content it strands. |
| `gtm rules` | List the content rules and their current severity. |
| `gtm explain <rule>` | Say what a rule checks and why it exists. |

Every command takes `-C, --cwd <dir>` and `--dir <dir>` (the spec directory, `gtm` by default). Reporting commands take `--format stylish|json|github`. Exit code 0 means clean, 1 means findings, 2 means the command was used wrongly.

## What `gtm build` writes

All output is deterministic. No timestamps, same bytes for the same input, which is what makes `gtm build --check` a real gate.

- **`robots.txt`** from one crawler policy. AI crawlers are grouped by purpose, because "may a model train on this" and "may an assistant cite this" are different decisions: `crawlers.ai.training`, `crawlers.ai.search` and `crawlers.ai.user`, each `allow` or `disallow`, with per-agent overrides.
- **`sitemap.xml`** from your content collections and declared routes. URLs come from file names, drafts and `noindex` pages are left out, and `lastmod` is only set when there is a real date.
- **`llms.txt`** in the [llmstxt.org](https://llmstxt.org) shape: who you are, what you are not, then every page with its description.
- **`GTM.md`**, the whole spec compiled into one brief: positioning, personas, pillars with the proof you may cite, vocabulary, topics, alternatives and the content rules. Point `AGENTS.md`, `CLAUDE.md` or your editor rules at it.
- **JSON-LD** (opt in with `outputs.schema`): a schema.org graph for the site and its owner, as a JSON file your layout can embed.

## Rules

`gtm lint` runs 21 content rules. `gtm validate` runs 11 spec checks. `gtm explain <rule>` prints the reasoning for any of them.

| Rule | Default | Checks that |
| --- | --- | --- |
| `seo/title` | error | Every page has a title in its frontmatter. |
| `seo/title-length` | warn | Titles fit the space search results give them. |
| `seo/description` | error | Every page has a description (or summary) in its frontmatter. |
| `seo/description-length` | warn | Descriptions are long enough to say something and short enough to survive truncation. |
| `seo/date` | error | Articles carry a real date in YYYY-MM-DD form. |
| `seo/slug` | warn | URLs are lowercase words separated by hyphens. |
| `seo/single-h1` | error | The frontmatter title is the only H1. |
| `seo/heading-order` | warn | Headings do not skip levels. |
| `seo/image-alt` | error | Images have alt text. |
| `seo/link-text` | warn | Link text says where the link goes. |
| `seo/internal-links` | error | Internal links and images point at something that exists. |
| `seo/min-internal-links` | warn | Articles link to at least one other page on the site. |
| `seo/placeholder` | error | No placeholder text or links ship. |
| `seo/markdown-fence` | error | Code fences are closed. |
| `seo/unique-title` | error | No two pages share a title. |
| `seo/unique-description` | warn | No two pages share a description. |
| `messaging/avoid` | warn | Content does not use terms the messaging spec rules out. |
| `messaging/prefer` | warn | Content uses the preferred spelling of the terms the team owns. |
| `messaging/refs` | error | Frontmatter personas, topics and pillars exist in the spec. |
| `messaging/topic-keywords` | warn | A page tagged with a topic uses that topic's language up front. |
| `messaging/untagged` | off | Articles declare the topic or persona they serve. |

Tune them in `gtm.yaml`:

```yaml
lint:
  rules:
    seo/title-length: [warn, { min: 30, max: 60 }]
    messaging/avoid: error
  overrides:
    - files: ["content/blog/2024-*.md"]   # the backlog you have not rewritten yet
      rules:
        seo/description-length: off
```

## CI

```yaml
# .github/workflows/gtm.yml
name: GTM
on: pull_request
jobs:
  gtm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx gtm check --format github
```

`--format github` turns findings into annotations on the pull request diff. To comment on strategy changes, run `npx gtm diff origin/main --format md` and post the output.

## Coding agents

An agent writing your landing page has never met your buyer. `GTM.md` is the introduction. Add one line to the file your agent already reads:

```md
<!-- AGENTS.md or CLAUDE.md -->
Read GTM.md before writing or editing anything customer-facing. Run `npx gtm check` before you finish.
```

The agent gets the positioning, the personas and the vocabulary up front, and `gtm check` tells it, with a file and a line, when it drifted. Claims with no proof on file are marked as such, so the agent does not state them as fact.

## Programmatic API

Everything the CLI does is a pure function over a loaded spec and a list of content items.

```ts
import { loadSpec, loadContent, lintContent, buildArtifacts, coverage } from 'gtm-toolkit';

const { spec, root, diagnostics } = loadSpec();
if (!spec) throw new Error(diagnostics[0].message);

const items = loadContent(root, spec);
const findings = lintContent(root, spec, items);       // Diagnostic[]
const files = buildArtifacts(spec, items);             // { name, path, content }[]
const report = coverage(spec, items);                  // personas, topics, questions
```

## Migrating from 0.5

Version 2 is a rewrite. `gtm init` reads an existing `gtm.config.js` and carries over the site name, URL, description and AI crawler setting.

- `gtm.config.js` is replaced by `gtm/gtm.yaml`.
- `generate` is now `build`. It overwrites its own output (0.5 skipped existing files, so they went stale) and builds sitemap URLs from file names (0.5 guessed them from titles).
- `lint` rule ids changed from `SEO-001` style to names such as `seo/title-length`. Keywords and categories are no longer hardcoded: they come from `topics.yaml`.
- `analyze`, `suggestions`, `fix` and `audit` are gone, along with the Google Search Console, Gemini and analytics-snippet code. They produced prompts or wrapped other products. See the [changelog](CHANGELOG.md) for the reasoning.

## What it does not do

It does not call a language model, track analytics, research keywords or publish anything. It reads files in your repo and writes files in your repo. That is the point: every decision is in a diff, and every check runs offline.

## License

MIT with attribution. See [LICENSE](LICENSE).
