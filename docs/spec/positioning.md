# Positioning

positioning.yaml declares your category, one-liner, the problem, who it is for, why you and not the alternative, and what you are not.

`gtm/positioning.yaml` is the shortest file in the spec and the one everything else leans on. It answers: what is this, who is it for, and why this instead of something else.

```yaml
category: "Deploy previews for data pipelines"
oneLiner: "Acme gives every pull request that touches a pipeline its own isolated copy of the data, so reviewers see results before merge."
tagline: "See the data before you merge."
problem: "A pipeline change looks fine in the diff and breaks a dashboard on Monday, because nobody could run it against real data first."
audience:
  - data-engineer
  - analytics-lead
differentiators:
  - id: isolated-data
    claim: "Previews run on a zero-copy branch of production data, not a sample."
    proof:
      - "Branching benchmark: 2 TB warehouse branched in 40 seconds (docs/benchmarks.md)"
  - id: lives-in-pr
    claim: "Results are posted on the pull request, where the review already happens."
    proof: []
notThis:
  - "Not a data catalog or an observability tool. It runs before merge, not after."
  - "Acme the data company, not Acme Corp from the cartoons."
```

## Fields

| Field | What to write |
| --- | --- |
| `category` | The shelf you want to be on. Prefer the words buyers already use over an invented category |
| `oneLiner` | What it is and who it is for, in one sentence a stranger would understand. Keep it within 160 characters so it can be reused as a meta description |
| `tagline` | Optional short line for headers and social cards |
| `problem` | The problem in the words of the people who have it |
| `audience` | Persona ids from `personas.yaml`, most important first |
| `differentiators` | Why you and not the alternative. Each has an `id`, a `claim` and `proof` |
| `notThis` | What you are not |

## Proof

A differentiator with an empty `proof` list is a `spec/unproven-claim` warning. The warning is not pedantry. `proof` changes what gets generated: in `GTM.md`, a claim with proof is listed with the evidence an agent may cite, and a claim without it is marked "no proof on file: do not state this as fact". That one line is the difference between an agent that writes "40-second branching on a 2 TB warehouse" and one that writes "blazing fast".

Proof can be a number with its source, a link, a named customer, a commit. It should be something a skeptical reader could check.

## notThis

People confuse you with adjacent products, and language models do it more. `notThis` is where you settle it. The entries are written into `llms.txt` under "Not to be confused with" and into `GTM.md`, so the disambiguation reaches both the models that read your site and the agents that write for it.

Use it for name collisions, for the category you are adjacent to but not in, and for the thing prospects assume you do that you do not.

## Checks that apply

- `spec/unknown-ref`: an `audience` entry is not a persona id.
- `spec/duplicate-id`: two differentiators share an id.
- `spec/unproven-claim`: a differentiator has no proof.
- `spec/length`: the one-liner is longer than 160 characters.
- `spec/own-vocabulary`: the one-liner, problem, tagline or a claim uses a term from `messaging.vocabulary.avoid`.
