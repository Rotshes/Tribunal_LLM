# Turn 019 — One call is not a verdict

Date: 8 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Turn 018 committed seven models on seven seats. Roy ran it five times and ran
`npm run compare`. The table said the allocation did not work. He asked for
replacement models, for somewhere to look himself, and for what to search for.

## 2. Specification

- Identify which seats actually failed, from the five runs and not from
  impressions.
- Find replacements that are cheap, non-free, and from a vendor the judges do
  not already use.
- Re-seat only what failed. Change nothing that worked.
- Record what the five runs proved, separately from what they did not.

## 3. Context supplied

The compare table over 40 stored deliberations, `panel/models.json`, decision
0013, and OpenRouter's model catalogue filtered by `response_format`.

## 4. Plan

Read the failures by role → screen four candidates → re-seat two → amend 0013
with the evidence it asked for.

## 5. Execution

### What the five runs actually showed

| | 0009 (two models) | 0013 (seven models) |
|---|---|---|
| Runs | 13 | 5 |
| Call failures | 1 of 91 (1%) | 9 of 35 (26%) |
| shamgar ruled | 13 of 13 | **0 of 5** |

Attributed by seat: shamgar ×5 (`nemotron`), grey_worm ×3 (`qwen3.7-flash`),
elon ×1. Nothing else failed.

The point that matters more than the failure rate: this project shows three
rulings side by side. A configuration that produced two judges in every run
cannot do that, whatever it does for divergence. The compare tool said so
itself — *"a panel this incomplete cannot support a comparison."*

### A misattribution, corrected inside the turn

I told Roy the `representative_id` misspellings (`daenerys_targator`,
`daenerys_targatorn`) were a current failure from `gemini-3.6-flash`. **They are
from turn 004 on 31.08 and were fixed in that turn** by attaching
`representative_id` in the runner instead of asking the model for it.

The cause: the compare tool's *Why calls failed* block aggregates across all 40
stored runs, and I read it as describing the five. Same shape as the four false
positives in `CLAUDE.md` — a number read without checking what it was counting.
Corrected to Roy in the same message rather than left standing.

### Four candidates screened

| Model | Result |
|---|---|
| `meta/muse-glimmer-30b` | works, 33.2s — **seated** (shamgar) |
| `inception/mercury-2.5` | works, 5.1s — **seated** (grey_worm) |
| `meta/muse-spark-1.3-contributor` | OpenRouter 403 in 0.3s: the account needs an 18+ confirmation — **not a verdict on the model**, it was never called |
| `inclusionai/ling-3.0-flash-fin` | empty response in 13.6s — rejected |

`muse-glimmer-30b` was chosen for shamgar on size rather than price or speed:
the seat's previous occupant failed by writing answers under a twenty-character
floor, so the relevant axis was whether a model writes enough, not whether it
writes fast.

### The allocation now

Advocates: `gemini-3.7-flash`, `gemini-3.8-flash`, `gemini-3.6-flash`,
`mercury-2.5`. Judges: `gemini-3.5-flash-lite` (Google),
`mercury-2.5-preview` (Inception), `muse-glimmer-30b` (Meta).

Seven distinct ids, three judge vendors, four vendors overall.

### What the turn refuses to claim

`inception/mercury-2.5` and `inception/mercury-2.5-preview` are **two ids and
probably one model**. The allocation is seven distinct ids and something short
of seven distinct models. Written into 0013's amendment, `panel/models.json` and
`src/config.js`, because the seat table will otherwise be read as claiming more
than it delivers.

### The finding worth more than the allocation

**One call is not a verdict.** Nemotron passed screening in 14.4s and failed all
five production runs. The screening tool stubbed *two* advocates where production
sends *four* — a judge answering two can spend a paragraph each; the same model
answering four writes "Yes, correct." The stub is four now (turn 018), and the
two models seated this turn passed against the harder stub.

That is still one call each. It is the same evidence that was worthless for
nemotron, and the honest position is that these seats are unproven.

## 6. Verification

74 tests pass. `npm run check` clean over 104 files (G5, G8, G9). The three
allocation tests from turn 018 still hold on the new seats: seven distinct ids,
three judge vendors, and every seated model observed to work.

**A gap in my own test, found by writing this record.** The seat test asserts
each seated model's `observed` starts with `works`. Nemotron's record now begins
`UNRELIABLE`, so the test would catch it *today* — but it read `works` for the
whole of turn 018 while the model was failing every run. The test cannot detect
a model that fails; it can only detect one whose record has already been updated
by hand. It is a check on bookkeeping, not on behaviour. Left as is and named
here rather than dressed up: the thing that actually catches this is running the
panel, and no unit test substitutes for that.

### Not verified

- **Neither new model has been run in a real deliberation.** One screening call
  each. This is the same evidence that misled us about nemotron.
- Whether the panel divides on this allocation. Still open, still the question
  0013 exists to answer.
- Whether `mercury-2.5` and `mercury-2.5-preview` differ at all. Assumed not.
- `qwen3.7-flash`'s 429s were upstream capacity on one afternoon. It may be
  fine next week. Marked UNRELIABLE on what was observed, not on what it is.

## 7. Outcome

Done: failures attributed by seat, four candidates screened, two seats replaced,
0013 amended with the five-run evidence, two models downgraded to UNRELIABLE
with their production records, one misattribution corrected.

Open: five runs on the amended allocation. **If shamgar or grey_worm fails
again, 0013's amendment says revert to 0009 rather than screen a third round** —
two rounds without a stable panel would mean the affordable model pool is not
deep enough to seat seven, which is a result in itself.
