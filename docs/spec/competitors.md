# Competitors

competitors.yaml declares the alternatives to your product, stated fairly, and the honest difference. It is what your coding agents will repeat.

`gtm/competitors.yaml` lists the alternatives a buyer weighs you against, including doing nothing.

```yaml
- id: staging-environment
  name: "A shared staging environment"
  kind: status-quo
  summary: "One long-lived copy of the warehouse that every change is tested against. Free to start and familiar to everyone."
  weDiffer: "Staging is shared and stale. A deploy preview is per pull request and branches current production data, so two changes cannot contaminate each other's results."

- id: rowdiff
  name: "RowDiff"
  url: https://rowdiff.example
  kind: direct
  summary: "Data diffing for pull requests: compares the output of a change against production, table by table."
  weDiffer: "A diff shows what changed in the tables. A preview also runs everything downstream, so the reviewer sees the dashboard, not only the rows."
```

## Fields

| Field | What to write |
| --- | --- |
| `id` | Stable id |
| `name` | The alternative, by name |
| `url` | Their site, optional |
| `kind` | `direct` (same job, same buyer), `adjacent` (overlapping job) or `status-quo` (what people do without a product) |
| `summary` | What they are, stated the way they would accept |
| `weDiffer` | The honest difference |

Always include the status quo. For most products the real competitor is a spreadsheet, a script or a meeting.

## Write it as if they will read it

This file is compiled into `GTM.md` under the instruction "Describe alternatives fairly. Compete on the stated difference, not on adjectives." Whatever you write here is what an agent will reproduce on a comparison page, in a docs FAQ, in a sales email draft.

That raises the bar in a useful way. A `summary` that caricatures the competitor produces copy that embarrasses you. A `weDiffer` that names a concrete difference produces copy that helps a buyer decide. If you cannot state the difference without an adjective, that is worth knowing before a prospect asks.

## Using it on a site

The comparison table on [What is GTM as code?](https://www.gtmascode.dev/gtm-as-code) is rendered directly from this site's `competitors.yaml`. The same sentences feed the page and brief the agents, so they cannot drift apart.

## Checks that apply

- `spec/duplicate-id`: two competitors share an id.
- `spec/schema`: `kind` is not one of the three values, or `summary` or `weDiffer` is missing.
