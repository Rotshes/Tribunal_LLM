# The Tribunal

ASE-26 running project — Agentic Software Engineering, Mikael Gorsky.

A web app that takes a charge sheet, has AI advocates argue opposing sides, and
has three AI judges rule on those arguments. The three rulings are reported
side by side with their reasoning and are never combined into one — the
disagreement is the output.

## What is in here

| Path | What it holds |
|---|---|
| `CLAUDE.md` | The agent's standing brief. Read this first. |
| `SETUP.md` | The five accounts and how to set them up. |
| `docs/00-framing.md` | Module 6: problem statement, stakeholders, definition of done, out-of-scope. |
| `docs/01-spec.md` | Module 10: the five-part specification. |
| `docs/02-charge-sheet-spec.md` | What each charge-sheet field means and what makes it valid. |
| `docs/decisions/` | One file per decision that could have gone another way, with the reasoning at the moment it was made. |
| `docs/turns/` | One record per turn of work, on the seven-part frame from Module 4. |
| `schemas/` | The enforceable forms: charge sheet in, opinion out. |
| `cases/` | The cases, as repository fixtures. `T-001` is the instructor's. |
| `panel/` | The three judges. Fixed across cases, because the course specification fixes the panel. |
| `prompts/` | The seven prompts — four advocates, three judges. Versioned like code, because they are. |
| `src/` | The runner: the seven calls, the gates, the providers, the call log. |
| `tools/repo-checks.js` | G5 and G8 — the checks that run over the repository rather than over a run. |
| `tests/` | The gates, tested mostly from the failing side. |
| `db/schema.sql` | The Supabase tables. Its most important property is a column that does not exist. |
| `netlify/functions/` | The HTTP wrapper. Thin on purpose — all the logic is in `src/`. |
| `web/` | One HTML file, no build step. See decision 0008. |
| `docs/evidence/` | The runs a turn record cites. `logs/` is gitignored; these are copied by hand. |
| `docs/PRE-SUBMISSION.md` | What to check before the deadline. Several items cannot be fixed late. |

## Reading this repo as a record

The seven-part frame from Module 4 — intent, specification, context, plan,
execution, verification, audit trail — is the shape of `docs/turns/`. Each turn
record is one spiral turn: what it was for, what was specified, what was placed
in the agent's reach, what it planned, what it did, how the result was checked,
and what that left open.

The decision records answer the question the code cannot: not what it does, but
why it is this way rather than the other way that was also considered.

## Running it

```
npm install
npm test                                       # the gates, mostly from the failing side
npm run check                                  # G5 and G8 over the repository
npm run deliberate -- T-001 --stub good        # a clean run against a fake model
npm run deliberate -- T-001 --stub judgefail   # two rulings and one failure
```

Stub modes: `good`, `unanimous`, `prose`, `badfact`, `verdict`, `onesided`,
`judgefail`. Each one exists to make a specific gate fire.

Before putting a new model on the allowlist in `panel/models.json`, try it —
**one** call, not seven:

```
npm run try-model -- deepseek/deepseek-v4-flash-0731
```

It runs a real judge prompt through the model, checks the answer against G2, and
prints the `observed` line to paste into `panel/models.json`. A test refuses any
entry without one, because OpenRouter's own `supported_parameters` catalogue
lists two models that fail in production.

Against real models — once `OPENROUTER_API_KEY` is set in `.env`. The models
themselves are not configured here: the per-role allocation is committed in
`modelMap()` in `src/config.js` (decision 0009), and the advocates and the
judges do not run the same one.

```
npm run deliberate -- T-001 --provider openrouter --json-mode object
```

Compare runs with `npm run compare`. In the browser:

```
npx netlify dev          # http://localhost:8888
```

## Status

**Live at https://subtle-axolotl-3f3681.netlify.app** — anyone can open it,
convene a tribunal, read three opinions, and read every past proceeding. The
last compare counted 26 recorded deliberations on T-001 (31.08.2026), with
deployed runs since.

What the runs established, in order:

- `response_format` support on OpenRouter is per *endpoint*, not per model. A
  call was silently routed to one that ignored it; G2 caught the prose (turn 003).
- Sending no `response_format` at all costs about 29% of calls. With it, 2%
  (turn 004).
- Before turn 005, three runs in five had **no defence case at all** — every
  advocate reached the same position, so the judges ruled on a case only one
  side was put in. Every advocate now argues `case_for_seat` regardless of where
  it personally lands, and every run since has been contested.
- **Divergence is a property of the judge model, not of argument quality.**
  Uniform `gemini-3.7-flash` returned three identical rulings in five runs of
  five; putting the same model on the advocates and `flash-lite` back on the
  judges brought the split straight back, with the advocates concluding
  identically in both conditions. The committed allocation follows from that
  (turn 010, decision 0009).
- **The catalogue is not evidence.** Every allowlisted model appears under
  OpenRouter's `?supported_parameters=response_format`; two fail in production,
  one with no routable endpoint and one by returning prose. Every entry now
  records what it was *observed* to do, and `npm run try-model` earns that
  record in one call. Five candidates were evaluated that way, one added and
  three rejected with dated reasons (turn 013).

Several earlier claims here were wrong and were corrected in the records rather
than quietly deleted: turn 003 concluded from two runs that the judges converge;
a later note called the routing constraint nearly free after one clean run; and
turn 012 computed three time budgets against a documented 60-second platform
limit while this deployment's own log said 30. `docs/turns/` carries all of it.

**Not done:** `G3` has never fired on real output — 73 of 74 judge opinions cite
all five facts — and the copied-case gate fires only in tests. Both are recorded
as written-and-unproven in `docs/GRADING-MAP.md`, not as passing. Two models on
the allowlist are known to fail and are labelled as such in the picker rather
than removed.

## Grading

`docs/GRADING-MAP.md` maps every requirement in the course grading rules to the
artifact that proves it. It is maintained as work lands, not at the end.
