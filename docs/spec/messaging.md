# Messaging

messaging.yaml declares your pillars and their proof, reusable boilerplate, the vocabulary you prefer and avoid, and voice guidance for writers and agents.

`gtm/messaging.yaml` holds what you say and how you say it. It is the file `gtm lint` reads most, and the one that makes the biggest difference to what a coding agent writes.

```yaml
pillars:
  - id: see-before-merge
    title: "See the data before you merge"
    claim: "A reviewer should judge a pipeline change by its results, not by reading SQL."
    proof:
      - "Median review time fell from 2 days to 3 hours across 14 design partners (2026 survey)"
    personas: [data-engineer, analytics-lead]

boilerplate:
  short: "Acme gives every pipeline pull request an isolated copy of production data, so reviewers see results before merge."
  medium: "Acme is a deploy preview platform for data teams. Every pull request that touches a pipeline runs against a zero-copy branch of production data, and the results are posted on the pull request for review."

vocabulary:
  prefer:
    - term: "deploy preview"
      insteadOf: ["preview deploy", "preview environment"]
      reason: "One name for the product's core object."
  avoid:
    - term: "leverage"
      reason: "Say what the thing does."
    - term: "single source of truth"
      reason: "Every vendor says it. Name the specific duplication we remove."

voice:
  - "Write for a data engineer who has been paged at 3am. No hype."
  - "Lead with the result, then the mechanism."
  - "Use numbers with their source or do not use numbers."
```

## pillars

A pillar is one of the few things you want to be known for. Each has a `title`, a `claim`, the `proof` that supports it and the `personas` it speaks to.

Three to five pillars is typical. A pillar with no proof is a `spec/unproven-claim` warning, and `GTM.md` tells agents not to present it as fact. Topics point at pillars with `pillar: <id>`, which is how `gtm coverage` can count the content behind each one.

## boilerplate

Approved descriptions for reuse: `short` for meta descriptions and bios (kept within 160 characters, or `spec/length` warns), `medium` for an about section or press. They are copied into `GTM.md` so nobody, human or agent, has to improvise the company description again.

## vocabulary.prefer

The spellings you own. For each `term`, list the variants under `insteadOf`. When a page uses a variant, `messaging/prefer` reports it and suggests the term:

```console
  19:1  warn  "preview environment" in body. Use "deploy preview".  messaging/prefer
              One name for the product's core object.
```

This is worth doing even for one term. If your site calls the same thing three names, search engines and language models see three weak terms instead of one strong one.

## vocabulary.avoid

Words and phrases you decided not to use, each with a `reason`. `messaging/avoid` checks titles, descriptions and body text, and prints your reason next to the finding, so the correction arrives with its explanation.

Matching is case-insensitive and respects word boundaries, so `leverage` does not match `leveraged buyout`. A term can also be punctuation: this site bans the em-dash that way. Code blocks, inline code and URLs are not checked.

The reason is the part people skip and should not. "Banned" teaches nothing. "Every vendor says it; name the specific duplication we remove" teaches the writer what to do instead, and an agent follows it just as well.

The rule is `warn` by default. Set `messaging/avoid: error` in `gtm.yaml` once your content is clean and you want it enforced.

## voice

Plain-language guidance, one point per line. It is not linted. It is compiled into `GTM.md` for the readers who can act on prose: people and agents.

## Checks that apply

- `spec/unknown-ref`: a pillar targets a persona that does not exist.
- `spec/unproven-claim`: a pillar has no proof.
- `spec/length`: `boilerplate.short` is over 160 characters.
- `spec/own-vocabulary`: your own pillars or boilerplate use a term you told everyone else to avoid.
- `messaging/avoid`, `messaging/prefer` (in `gtm lint`).
