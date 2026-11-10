# Personas

personas.yaml declares who you write for: their jobs, pains and triggers, and the questions they ask search engines and AI assistants.

`gtm/personas.yaml` is a list of the people you write for. Content points at a persona with `persona: <id>` in its frontmatter.

```yaml
- id: data-engineer
  name: Data engineer
  role: "Owns the pipelines and gets paged when they break"
  description: "Ships changes to dbt models and orchestration daily. Trusts tests more than dashboards."
  jobs:
    - "Change a pipeline without breaking what depends on it"
    - "Get a review from someone who can see the effect, not only the SQL"
  pains:
    - "Staging data is a stale sample, so staging results mean little"
    - "Breakage is found by a stakeholder, days later"
  triggers:
    - "A bad merge took down an executive dashboard"
    - "The team adopted dbt and the number of changes per week tripled"
  questions:
    - "How do I test a dbt change against production data?"
    - "What is a deploy preview for a data pipeline?"
    - "How do I branch a warehouse without copying it?"
```

## Fields

| Field | What to write |
| --- | --- |
| `id` | Lowercase, kebab-case, stable. Renaming an id strands the content that references it, and `gtm diff` will tell you which |
| `name` | What the team calls this reader |
| `role`, `description` | Who they are, in a line or two |
| `jobs` | Jobs to be done: what they are trying to get done |
| `pains` | What makes that hard today |
| `triggers` | Events that send them looking for a solution |
| `questions` | What they type into a search box or ask an assistant |

Describe behavior and situation. Age, hobbies and a stock photo name do not help anyone write a better page.

## Questions are the point

`questions` is the field that turns a persona from a poster into a working tool. Each question is a content brief with a built-in definition of done: is there a published page that answers it?

A page claims an answer in its frontmatter:

```yaml
answers:
  - "How do I test a dbt change against production data?"
```

Matching ignores case and punctuation. Then `gtm coverage` reports both sides:

```console
Questions: 1 of 3 answered
  ○ What is a deploy preview for a data pipeline? persona:data-engineer
  ○ How do I branch a warehouse without copying it? persona:data-engineer
  ● How do I test a dbt change against production data? /blog/2026-02-01-testing-dbt
```

The open circles are your backlog. They are also, increasingly, the prompts people give an assistant, which makes this list the closest thing you have to a keyword plan for AI search.

Take the questions from real sources: sales calls, support tickets, community threads, search console queries. An invented question produces invented content.

## Checks that apply

- `spec/duplicate-id`: two personas share an id.
- `spec/persona-questions`: a persona has no questions.
- `spec/unused-persona`: no positioning audience, pillar or topic targets the persona.
- `messaging/refs` (in `gtm lint`): a page's `persona` is not a declared id.
