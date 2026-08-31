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

Against real models — once `OPENROUTER_API_KEY` and `TRIBUNAL_MODEL` are set in
`.env`:

```
npm run deliberate -- T-001 --provider openrouter
```

## Status

**Runs end to end against a fake model. Never yet against a real one.**

As of 24.08.2026: the case domain is fixed (`T-001 — The Realm v. Jon Snow`),
the five-part specification is written, the charge sheet is a schema plus its
first instance, all seven prompts are at v1.0, and the seven-call protocol
executes with all eight gates in place. Each gate has failed at least once on
purpose — see `docs/turns/002-…`.

What that does **not** establish: no OpenRouter call has been made, so the
provider is written and unexercised, the token and cost figures in the log are
fabricated by the stub, and nothing shows whether the three judge prompts
produce three distinct voices or one voice three times. That last one is the
likeliest failure in this design and the stub cannot detect it — it invents the
differences.

## Grading

`docs/GRADING-MAP.md` maps every requirement in the course grading rules to the
artifact that proves it. It is maintained as work lands, not at the end.
