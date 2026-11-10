# Brief your coding agents

Use GTM.md to give Claude Code, Cursor, Codex and other coding agents your positioning, personas and vocabulary, then verify their output with gtm check.

A coding agent asked to "add a pricing page" will write a competent pricing page for a company that does not exist. It has never met your buyer, does not know which words you retired, and will happily invent a claim. The fix is not a longer prompt. It is context the agent reads every time, and a check it can run on its own work.

## GTM.md is the brief

`gtm build` compiles the whole spec into one Markdown file, `GTM.md` by default. It contains, in this order:

- What the site is and who stands behind it
- Positioning: category, one-liner, problem, why you, and what you are not
- Each persona with their jobs, pains, triggers and questions
- Messaging pillars, with the proof the agent may cite
- Approved boilerplate
- Vocabulary: what to say, and what never to use, with the reasons
- Voice guidance
- Topics with their keywords and the questions they should answer
- Alternatives and the stated difference
- The content contract: where content lives, the frontmatter it needs and the rules `gtm lint` enforces
- The crawler policy
- A closing instruction to run `npx gtm check`

It is generated, so it cannot contradict the spec or go stale without failing `gtm build --check`.

## Point the agent at it

Agents read an instruction file at the start of a session. Add two sentences to yours:

```md
<!-- AGENTS.md, CLAUDE.md, .cursor/rules, or the equivalent -->
Read GTM.md before writing or editing anything customer-facing: pages, posts, docs, UI copy, metadata.
Before you finish, run `npx gtm check` and fix every error it reports.
```

Keep the instruction file short and let `GTM.md` carry the content. One file is the spec's output, the other is your instructions, and neither needs hand-syncing.

## The check is the other half

Instructions are advice. `gtm check` is verification, and it speaks in a form agents handle well: a file, a line, a rule and a reason.

```console
content/blog/2026-03-01-pricing-update.md
  1:1   error  Missing `description` in frontmatter.  seo/description
  14:9  error  Link target /plans does not exist.  seo/internal-links
  22:5  warn   "leverage" in body.  messaging/avoid
               Say what the thing does.
```

An agent that sees this fixes the frontmatter, corrects the link to a URL that exists and rewrites the sentence. No human had to read the draft to find those three problems. Review time goes to the things only a person can judge: whether the argument is right and the piece is worth publishing.

## Claims and proof

`GTM.md` treats proof as a permission system. A pillar or differentiator with proof is listed with it:

```md
### See the data before you merge (`see-before-merge`)

A reviewer should judge a pipeline change by its results, not by reading SQL.

Proof you may cite:

- Median review time fell from 2 days to 3 hours across 14 design partners (2026 survey)
```

One without proof says so:

```md
- **Results are posted on the pull request.** (no proof on file: do not state this as fact)
```

This is the most reliable way to stop invented statistics. The agent has the real number in front of it, with a source, and an explicit instruction about the claims that have none.

## Give it the questions

When you ask an agent for a new piece, start from the backlog:

```bash
npx gtm coverage
```

Pick an open question, and ask for a page that answers it for the persona who asks it. The agent already has that persona's jobs and pains from `GTM.md`, the topic's keywords, and the frontmatter contract, including the `answers` field that will close the question in the next coverage report.

## What this does not solve

The toolkit checks structure, links, vocabulary and references. It cannot tell whether a paragraph is true, interesting or yours. An agent can pass every rule and still write something nobody should publish. Keep a person on the argument.

## Related

- [Messaging](../spec/messaging.md): where vocabulary and voice are declared.
- [Run it in CI](ci.md): the same check, enforced on every pull request.
- [The Agentic Shift Left](https://www.gtmascode.dev/blog/2025-12-06-why-gtm-toolkit-essential-for-agentic-coding): the essay behind this guide.
