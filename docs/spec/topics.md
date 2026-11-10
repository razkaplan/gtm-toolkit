# Topics

topics.yaml is the keyword source of truth: what you want to be found for, the phrases each topic uses and the questions it should answer.

`gtm/topics.yaml` lists what you want to be found for. It replaces the keyword spreadsheet: one place, in the repo, that the linter and the coverage report both read.

```yaml
- id: data-deploy-previews
  name: Deploy previews for data
  description: "Running pipeline changes against real data before merge."
  pillar: see-before-merge
  personas: [data-engineer]
  keywords:
    - "deploy preview"
    - "data pipeline testing"
    - "dbt CI"
  questions:
    - "What is a deploy preview for a data pipeline?"
    - "How is a data deploy preview different from a staging environment?"
```

## Fields

| Field | What to write |
| --- | --- |
| `id` | Stable id. Content uses it with `topic: <id>` |
| `name` | The topic as a reader would name it |
| `description` | What the topic covers, in a sentence |
| `pillar` | The messaging pillar this topic supports |
| `personas` | Persona ids who care about it |
| `keywords` | Phrases a page on this topic is expected to use |
| `questions` | Questions the topic should answer |

## How keywords are used

When a page is tagged with a topic, the `messaging/topic-keywords` rule looks for at least one of the topic's keywords in the title, the description or the first 150 words:

```console
  7:1  warn  Tagged "data-deploy-previews" but the title, description and first 150 words use none of its keywords.  messaging/topic-keywords
             Keywords: deploy preview, data pipeline testing, dbt CI.
```

Either the page is about something else and the tag is wrong, or the page buries its subject. Both are worth knowing. The rule asks for one keyword, used once, near the top. It is a check that the page says what it is about, not a density target.

Matching is case-insensitive and whole-word. List the variants you consider equivalent ("dbt CI", "CI for dbt") as separate keywords.

## Topics and coverage

`gtm coverage` counts published pages per topic and shows the date of the newest one:

```console
Topics
id                    pieces  newest
data-deploy-previews  6       2026-03-02
warehouse-branching   1       2025-06-11
```

One page from last June on a topic you call strategic is a finding. A topic also counts toward its pillar, so the same report shows which pillars have content behind them and which are only a slide.

Topic `questions` join the persona questions in the coverage report, and are answered the same way, through `answers` in frontmatter.

## Topic pages

Because topics are data, a site can build pages from them. The [topic pages] on gtmascode.dev(https://www.gtmascode.dev/topics/gtm-as-code) and its topic filters are rendered from `topics.yaml` through the [programmatic API](../reference/api.md).

## Checks that apply

- `spec/duplicate-id`, `spec/unknown-ref` (for `pillar` and `personas`).
- `messaging/refs`: a page's `topic` is not a declared id.
- `messaging/topic-keywords`: a tagged page does not use the topic's language up front.
- `messaging/untagged` (off by default): an article has neither a topic nor a persona.
