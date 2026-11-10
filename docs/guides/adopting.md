# Adopt it on an existing site

How to bring GTM Toolkit to a site with years of content: fix the errors, fence off the backlog with overrides, tag what you have and ratchet the rules.

A new linter on an old site produces a wall of findings, and a wall of findings gets ignored. This guide is the sequence used to adopt GTM Toolkit v2 on gtmascode.dev, which had 28 posts written over a year and a half to no fixed standard.

## 1. Scaffold and look

```bash
npx gtm init
npx gtm lint
```

Do not fix anything yet. Count the findings by rule:

```bash
npx gtm lint --format json | node -e '
  const report = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const count = {};
  for (const d of report.diagnostics) count[d.severity + " " + d.rule] = (count[d.severity + " " + d.rule] || 0) + 1;
  console.table(count);
'
```

On gtmascode.dev the first run reported 4 errors and 175 warnings. The shape mattered more than the total: one rule accounted for 122 of the warnings.

## 2. Fix the errors

Errors are the short list, and they are usually real. All four on this site were `seo/internal-links`: links in two published posts pointing at URLs that had never existed. Anyone who clicked them got a 404.

```console
content/blog/2025-12-14-optimized-gtm-org-structure-in-the-ai-era.md
  19:1   error  Link target /blog/gtm-as-code-part-one does not exist.  seo/internal-links
```

If an error is a false alarm, it is almost always a route the toolkit does not know about. Declare it under `content.routes`.

Use `--quiet` while you work through them, so the warnings stay out of the way:

```bash
npx gtm lint --quiet
```

## 3. Fence off the backlog

For warnings, separate two questions: what is the standard from now on, and what do you do about the past.

Set the standard at the top level. Then relax it, by date or folder, for what was written before the standard existed:

```yaml
lint:
  rules:
    messaging/avoid: error            # the rule, from today
  overrides:
    - files: ["content/blog/2025-*.md", "content/blog/2026-0[1-9]-*.md"]
      rules:
        messaging/avoid: warn         # the backlog: tracked, not blocking
        seo/slug: off                 # these URLs are live; changing them needs redirects
```

New content is held to the rule at full strength. Old content is still measured, so the debt has a number, but it cannot block an unrelated change.

Turn a rule `off` only when the finding is something you have decided not to fix, such as the slug of a URL that is already indexed. Prefer `warn` for anything you might clean up.

## 4. Turn on the gate

With zero errors, add the check to your test script and to [CI](ci.md):

```bash
npx gtm build
npx gtm check --quiet
```

From this point nothing gets worse.

## 5. Tag what you have

Coverage is empty until content points at the spec. Go through the archive once and add `topic` and `persona` to each post:

```yaml
topic: gtm-as-code
persona: gtm-engineer
```

It is a quick pass and a useful one: you find out what you have actually been writing about. Add `answers` only where a post really settles one of the questions in the spec.

`messaging/topic-keywords` will now warn about posts whose opening does not use the language of their topic. Some of those are mis-tagged. Some reveal that your keyword list is missing a phrase you use all the time, and the fix is in `topics.yaml`.

## 6. Read the coverage report

```bash
npx gtm coverage
```

```console
26 of 28 published articles are tagged with a topic or persona.

Topics
id                pieces  newest
gtm-as-code       8       2025-12-06
agentic-gtm       6       2026-06-25
ai-visibility     1       2025-03-10
startup-gtm       6       2026-09-17
building-in-code  5       2026-08-23
```

That table was the most useful output of the whole exercise. AI visibility is one of this site's stated pillars, and the report showed a single post on it, twenty months old. No amount of rereading the blog would have made that as obvious as one row did.

The open questions at the bottom of the report become the editorial calendar.

## 7. Ratchet

Adoption is not finished at the first green check. Tighten it as the backlog shrinks:

- Cap warnings at the current count with `--max-warnings`, and lower the cap when you clean up.
- Narrow the override globs as you rewrite old posts.
- Turn on `messaging/untagged` as an error once every article has a topic or persona, so new posts cannot skip it.
- Move `messaging/prefer` from `warn` to `error` when the archive is consistent.

Each step turns something you remember to check into something that is checked.
