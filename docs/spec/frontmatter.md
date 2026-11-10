# Content frontmatter

The frontmatter fields GTM Toolkit reads from your Markdown: title, description, date, topic, persona, pillar, answers, draft and noindex.

Content joins the spec through YAML frontmatter at the top of each Markdown file. The toolkit reads a small set of keys and ignores the rest, so your site can keep whatever fields it already uses.

```yaml
---
title: "How to test a dbt change against production data"
description: "Three ways to run a dbt change on real data before merge, what each costs, and where a deploy preview fits."
date: 2026-02-01
updated: 2026-03-10
topic: data-deploy-previews
persona: data-engineer
pillar: see-before-merge
answers:
  - "How do I test a dbt change against production data?"
---
```

## Fields

| Key | Accepted aliases | Used for |
| --- | --- | --- |
| `title` | | Required. The page title, the H1, the link text in `llms.txt` |
| `description` | `summary`, `excerpt` | Required. Meta description and the sentence after the link in `llms.txt`. The first one present wins |
| `date` | | Required for `article` collections. `YYYY-MM-DD` |
| `updated` | `lastmod`, `modified` | `lastmod` in the sitemap. Falls back to `date` |
| `topic` | `topics` | A topic id, or a list of them |
| `persona` | `personas` | A persona id, or a list |
| `pillar` | `pillars` | A pillar id, or a list. Usually unnecessary: a page counts toward the pillar of its topic |
| `answers` | | Questions from the spec that this page settles |
| `draft` | | `true` keeps the page out of the sitemap, `llms.txt` and coverage. It is still linted |
| `noindex` | | `true` keeps the page out of the sitemap and `llms.txt` |

## Dates

Write dates as `YYYY-MM-DD`, quoted or not. Both `date: 2026-02-01` and `date: "2026-02-01"` work. A date that is not a real calendar date, or is in another format such as `March 3, 2026`, fails `seo/date`.

Only real dates reach the sitemap. A page with no date gets no `lastmod`, because a made-up modification date is worse than none.

## The title is the H1

The toolkit assumes your page template renders `title` as the page's H1. A second `# Heading` in the body is reported by `seo/single-h1`, and body headings should start at `##`. If your template does not render the title, turn that rule off.

## References are checked

`topic`, `persona` and `pillar` must be ids declared in the spec. A typo, or an id that was renamed, is a `messaging/refs` error with the list of valid ids:

```console
  7:1  error  Unknown persona "data-enginer".  messaging/refs
              Declared: data-engineer, analytics-lead.
```

## Answers

List a question exactly as it is written in `personas.yaml` or `topics.yaml`. Case and punctuation are ignored when matching. A question that matches nothing is not an error: it simply does not count in `gtm coverage`.

Claim an answer only when the page really settles the question. The value of the coverage report is that it is true.

## What is not checked

Code fences, inline code and URLs are skipped by the vocabulary rules and the placeholder rule, so a `TODO` in a code sample or a retired product name inside a link target is not a finding.
