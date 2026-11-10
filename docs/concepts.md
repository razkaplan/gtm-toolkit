# Concepts

The model behind GTM Toolkit: a spec you declare, checks that run before publishing, outputs that are compiled, and coverage you can measure.

GTM Toolkit applies one loop to your go-to-market: declare, check, compile, measure. This page explains each part and the reasoning behind the design. For the argument about why go-to-market should work this way at all, read [What is GTM as code?](https://www.gtmascode.dev/gtm-as-code)

## The spec

The spec is a directory, `gtm/` by default, of YAML files:

| File | Holds |
| --- | --- |
| `gtm.yaml` | The site, its owner, content collections, routes, crawler policy, outputs and lint settings |
| `positioning.yaml` | Category, one-liner, problem, audience, differentiators and what you are not |
| `personas.yaml` | Who you write for and the questions they ask |
| `messaging.yaml` | Pillars with proof, boilerplate, vocabulary and voice |
| `topics.yaml` | What you want to be found for: keywords and questions |
| `competitors.yaml` | The alternatives and the honest difference |

Each strategy file can also live inline in `gtm.yaml` under its own key. Use one or the other: declaring a section in both places is an error.

Things in the spec have ids (`technical-founder`, `gtm-as-code`). Ids are how the pieces refer to each other, and how content refers to the spec. They are checked like imports: a reference to an id that does not exist fails.

## Content joins the spec through frontmatter

A page says which part of the strategy it serves:

```yaml
---
title: What GTM as code means for a small team
description: What goes in the repo, what gets checked, and what a small team gets back.
date: 2026-01-05
topic: gtm-as-code
persona: technical-founder
answers:
  - "What is GTM as code?"
---
```

That link is what makes the rest possible. The linter can check that a page tagged with a topic uses the topic's language. Coverage can count what you have published for each persona. A diff can tell you which pages a renamed topic strands.

## Two kinds of checks

`gtm validate` checks the strategy. It is the review a good colleague would give the spec: this pillar makes a claim with no evidence, this persona has no questions so there is nothing to answer for them, your own one-liner uses a word your vocabulary bans.

`gtm lint` checks the content against the strategy. Its rules fall in two groups:

- `seo/` rules are about the shape of a page: titles, descriptions, dates, heading order, alt text, and whether every internal link points at a URL the site actually serves.
- `messaging/` rules are about what the page says: vocabulary you avoid, spellings you prefer, references to personas and topics, and whether a page uses the language of the topic it claims.

Rules are `error`, `warn` or `off`. Errors fail the command. Warnings are reported and counted, and `--max-warnings` lets you cap them. The full list is in the [rules reference](reference/rules.md).

## Outputs are compiled, and deterministic

`gtm build` writes files from the spec and the content:

| Output | Default path | For |
| --- | --- | --- |
| `robots.txt` | `public/robots.txt` | Crawlers, including a policy for AI crawlers by purpose |
| `sitemap.xml` | `public/sitemap.xml` | Search engines |
| `llms.txt` | `public/llms.txt` | Language models and the agents that browse for them |
| `GTM.md` | `GTM.md` | Coding agents and new teammates |
| JSON-LD | off | Search engines. Turn it on with `outputs.schema` |

Two properties matter here.

**Generated files are owned by the build.** They are rewritten on every run. If you want something different in `robots.txt`, you change the spec. This is the opposite of scaffolding a file once and hoping somebody keeps it current.

**Output is deterministic.** There are no timestamps and no ordering that depends on the machine. The same spec and content always produce the same bytes. That is what makes `gtm build --check` possible: it rebuilds in memory, compares with what is on disk, and fails if they differ. A stale sitemap becomes a failed check instead of a discovery six months later.

URLs come from file names and the collection's `url` pattern. They are never guessed from titles.

## Three audiences

Every page now has three kinds of reader, and the outputs map to them:

- **People** read the pages. The linter keeps the pages on message.
- **Search engines** read structure: the sitemap, structured data, canonical URLs, heading order.
- **AI models and agents** read both, and read them literally. `llms.txt` gives them an index with a description of every page, the crawler policy tells them what they may do, and `GTM.md` briefs the agents working inside your repository.

One spec feeds all three, so they cannot disagree.

## Measuring: coverage and diff

`gtm coverage` compares strategy with execution. For every persona, topic and pillar it counts the published pages tagged with it, and for every question in the spec it shows which page, if any, lists it under `answers`. The unanswered questions are a content backlog you did not have to brainstorm.

`gtm diff <ref>` compares the spec in your working tree with the spec at a git ref and reports what changed in terms of the strategy: a persona renamed, a question added, the training-crawler policy flipped. If an id was removed, it lists the content that still points at it.

## What the toolkit leaves out, on purpose

No language model calls, no analytics, no keyword research, no publishing. Those are other tools' jobs, and each one would make the checks slower, less predictable or dependent on a network. The toolkit's job is to make the strategy explicit and keep everything else honest about it.
