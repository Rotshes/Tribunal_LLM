# 0009 — The advocates and the judges run different models

Status: accepted (Roy, 31 August 2026)
Date: 31 August 2026
Evidence: `docs/turns/010-model-comparison.md`, and the compare table over 23
runs of T-001 it cites.

## The decision

The committed allocation in `modelMap()` (`src/config.js`) is:

| Layer | Model |
|---|---|
| The four advocates | `google/gemini-3.7-flash` |
| The three judges | `google/gemini-3.5-flash-lite` |

This replaces "one model for all seven calls", which was the stated starting
state, not a preference. `TRIBUNAL_MODEL` no longer sets anything;
`TRIBUNAL_UNIFORM_MODEL` flattens all seven onto one model and exists for
control runs only.

## Why, and what it was chosen over

Three conditions, same case, same prompts, same temperature.

| Condition | Runs | barak | elon | shamgar |
|---|---|---|---|---|
| flash-lite everywhere | 13 | justified ×7, not ×6 | not ×12, justified ×1 | not ×12, 1 failure |
| **3.7-flash everywhere** | 5 | **justified ×5** | **justified ×5** | **justified ×5** |
| **3.7-flash advocates, flash-lite judges** | 5 | justified ×3, not ×2 | not ×4, justified ×1 | not ×5 |

The middle row is the finding. Five runs, fifteen opinions, one answer. Three
judges given deliberately different methods, reading identical input, never
seeing each other — and the panel never divided once.

The third condition was run to attribute that. If the uniformity came from the
advocates producing arguments so clear that any judge would reach the same
place, then keeping 3.7-flash on the advocates should have kept the panel
unanimous. It did not. With flash-lite back on the judges the split returned,
and returned to almost exactly flash-lite's own pattern: barak divided, elon and
shamgar mostly `not_justified`.

**So divergence here is a property of the judge model, not of argument quality.**
That is a narrower and less flattering claim than "our panel disagrees because
the methods differ", and it is the one the numbers support.

**3.7-flash everywhere.** Rejected. It is the better model and it produces the
worse tribunal: a panel that returns the same ruling three times is a single
opinion printed three times, and the entire design — three columns, never
combined (0002) — has nothing to show. It is also the slowest condition measured
(26.9–34.5s wall against 15.0–27.9s) and the most expensive.

**flash-lite everywhere.** Rejected, but it was close, and it is the honest
alternative. It divides, it is cheapest, and it is what every measurement before
turn 010 was made on. It loses on the advocate side: the one-sided-panel problem
of turn 005, the misspelled `representative_id` that cost a call, and the prose
returned under `--json-mode off` all came from advocates, not judges. The
advocates do the writing; the layer that writes gets the better model.

**A different model per judge** — four providers, a genuinely mixed panel.
Not chosen, and explicitly not ruled out. It is the interesting experiment and
this turn does not have the runs to support it. Doing it now would mean
committing an allocation on the strength of a guess, which is the thing this
record exists to prevent. Condition 3 is a *layer* comparison; a per-judge
allocation needs a per-judge comparison.

## What this decision does not claim

- **Not that flash-lite judges are "better judges".** They divide. Whether they
  divide *for good reasons* is a separate question this data cannot answer, and
  reading three flash-lite opinions is the only way to answer it.
- **Not that 3.7-flash advocates produce better arguments.** Not measured. The
  advocate side of the change rests on where past defects came from, which is an
  argument about risk, not a demonstration of quality. Stated here rather than
  dressed up.
- **Not that the split is stable.** 5 runs per condition at temperature 0.7.
  Condition 3's barak went 3–2; that is a coin the sample cannot call.

## What it costs

- More expensive per run than the flash-lite baseline: four calls move from
  $0.30/M to $0.75/M input.
- Every pre-turn-010 measurement was made on a uniform panel and does not
  describe what the app now runs. Those runs stay in the record and stay
  labelled — `model_map` is stored per run precisely so this does not silently
  rewrite them.
- The allocation is now two values that must be read together. A reader who
  looks only at the advocates, or only at the judges, has half of it.

## What would change this

- A per-judge comparison with enough runs to separate three judge models.
- Any run where the mixed panel returns unanimity as consistently as condition 2
  did — the reason for the mix would be gone.
- A price change that makes 3.7-flash on four calls not worth it.
