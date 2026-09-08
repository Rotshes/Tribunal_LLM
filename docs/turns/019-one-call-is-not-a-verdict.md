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

## 6b. Postscript, same evening — the five runs, and a defect in the reporting

Roy ran the five. The compare table said **21 of 35 calls failed (60%)** on the
new allocation, which reads as a worse result than the one it replaced.

**Fifteen of the twenty-one were OpenRouter refusing on the account**, not the
models: twelve `This request requires more credits, or fewer max_tokens` and
three `Key limit exceeded (total limit)`. The credit ran out partway through the
session. No model was asked anything on those calls.

The first run, before the wall:

| | barak | elon | shamgar | differ |
|---|---|---|---|---|
| 20:52, **complete 7/7** | justified | justified | not_justified | **yes** |

`meta/muse-glimmer-30b` ruled, and the panel divided. One run.

### The defect this exposed

`tools/compare.js` counted a billing refusal and a model producing prose as the
same event. Three consequences, all of them wrong in the same direction:

- the per-config rate said 60% when the model-attributable rate was 17%;
- *failures by role* put jon_snow, tyrion and daenerys at four each, inventing a
  pattern out of whichever seats were in flight when the credit ran out;
- the "cannot support a comparison" warning fired on a panel whose only
  completed run was clean.

The tool's own header says *"a failure rate is a number; the reason is what
tells you what to change."* It was pointing at the models while the reason
pointed at the wallet.

Fixed by `isAccountFailure()` in `src/failures.js` — in `src/`, not in the tool,
so it can be tested and so a second reporting path cannot write a different rule.
Account refusals are excluded from the rate and the role tally, and labelled
`[ACCOUNT, not the model]` in the reason list. They are excluded from the rate,
not from the record: a run that died on billing is still a run that produced no
panel.

**Two exclusions are deliberate and are what the test actually guards.** A 429
and a 404 are *not* account-side. They are real evidence against a model —
qwen3.7-flash lost grey_worm's seat for 429s and gpt-5.6-luna is marked FAILS for
404s — and a classifier that excused them would hand two models their seats back
on a technicality. Verified by breaking it in both directions: removing the
credit pattern fails the test, and adding `429` to it fails the test.

### The lesson, and it is the third time

This is the same mistake as the `daenerys_targator` misattribution earlier in
this turn, and as the four false positives in `CLAUDE.md`: **a number read
without checking what it was counting.** Twice in one turn, from the same tool.
The fix this time is in the tool rather than in my attention, which is the only
version of the fix that survives the next session.

## 6c. Postscript — the four runs after the top-up

| Run | barak | elon | shamgar | Panel |
|---|---|---|---|---|
| 20:52 · 7/7 | justified | justified | not_justified | divided |
| 20:59 · 7/7 | justified | not_justified | not_justified | divided |
| 21:00 · 7/7 | justified | not_justified | not_justified | divided |
| 21:00 · 7/7 | justified | not_justified | not_justified | divided |
| 21:01 · 6/7 | justified | not_justified | not_justified | divided |

**34 of 35 calls, three judges every time, a divided panel every time.** The one
failure was grey_worm on `/concedes/2 must NOT have fewer than 20 characters` —
an advocate, and the panel was unaffected. 31–48s per run.

The four credit-dead runs are excluded from that table on purpose, and not only
because they are incomplete: OpenRouter's refusal reads *"requires more credits,
or fewer max_tokens"*, so the calls that did get through were truncated by the
provider. That accounts for the six non-account failures inside them — barak
returning fewer than two `responds_to` items, shamgar missing `no_facts_reason`,
`relies_on_facts` arriving non-integer. Those are not failures of models, they
are failures of models given a budget. Contaminated, not merely partial.

The compare tool now separates the account refusals from the rate but still
counts those four runs in the config's denominator, which is why the header reads
11% where the five real runs are 3%. Named rather than fixed: excluding a whole
run from a comparison is a bigger judgement than excluding a call, and it is not
one to make at the end of a long turn.

### The finding worth more than any of it

The per-judge leans survived their models being replaced. shamgar went from a
Google model to a Meta one and ruled `not_justified` five times out of five, as
it had thirteen times out of thirteen before. elon went to Inception and kept
leaning `not_justified`.

0013 was filed under the cost that three judge models make divergence
unattributable between method and model. This points the other way — the lean
travels with the seat. **Five runs, and three confounds** written into 0013's
amendment: barak is the same model in both columns, elon's 4–1 is inside what a
coin does at temperature 0.7, and the advocate side changed too so the judges are
not reading identical input across the comparison. The experiment that would
settle it is permuting the three judge models between the three seats.

## 7. Outcome

Done: failures attributed by seat, four candidates screened, two seats replaced,
two models downgraded to UNRELIABLE with their production records, one
misattribution corrected, `isAccountFailure()` and its test so a billing wall
never again reads as a broken allocation, and 0013 amended with the five-run
result and the per-judge-lean table.

**The allocation stands.** Five runs, 34 of 35 calls, three judges every time, a
divided panel every time — against 26% failures and an empty shamgar seat before
the replacement.

Open, in order of what they would settle:

1. **0013's status line.** It still reads *provisional*. On this evidence it can
   be accepted, and that is Roy's line to write, not mine.
2. **Permute the three judge models between the three seats.** The one experiment
   that would turn the per-judge-lean table from suggestive into evidence, and
   the direct answer to the attribution cost 0013 was filed under.
3. **Whether a run killed by an account refusal belongs in a config's
   denominator at all.** Today it does, which is why the tool reads 11% where
   the five real runs are 3%.
