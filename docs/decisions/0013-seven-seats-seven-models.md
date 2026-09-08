# 0013 — Seven seats, seven models

Status: **provisional.** Accepted on instruction (Roy, 8 September 2026);
adopted before the comparison that 0009 said this change would need.
Date decided: 8 September 2026
Date written: 8 September 2026
Supersedes: `0009-advocates-and-judges-run-different-models.md`
Evidence: `docs/turns/018-seven-seats-seven-models.md`, and the eight screening
calls it records.

---

## Amendment, 8 September 2026 — two seats replaced after five runs

The table below is what was committed first. It ran five times and produced this:

| | 0009 (two models) | 0013 as first committed |
|---|---|---|
| Runs | 13 | 5 |
| Call failures | 1 of 91 (**1%**) | 9 of 35 (**26%**) |
| shamgar ruled | 13 of 13 | **0 of 5** |

`nvidia/nemotron-3.5-lightning` failed all five — three times on
`/responds_to/0/answer must NOT have fewer than 20 characters`, once on a
`representative_id` pattern, once cut off at 90s. `qwen/qwen3.7-flash` failed
three of five: two upstream 429s and one cut-off. Both had passed a single
screening call.

Two seats therefore change, and nothing else does:

| Seat | Was | Now |
|---|---|---|
| judge · shamgar_model | `nvidia/nemotron-3.5-lightning` | `meta/muse-glimmer-30b` |
| advocate · grey_worm | `qwen/qwen3.7-flash` | `inception/mercury-2.5` |

**Two things this amendment does not claim.**

It does not claim the new models are reliable. Each has passed exactly one
screening call, which is precisely the evidence that turned out to be worthless
for nemotron. The status stays **provisional** and five more runs are owed.

It does not claim seven distinct models. `inception/mercury-2.5` and
`inception/mercury-2.5-preview` are two ids and are probably one model. The
allocation is seven distinct ids, four vendors, and something short of seven
distinct models — stated here because the table above will otherwise be read as
claiming more.

**The finding that outlasts the allocation:** one call is not a verdict. The
screening tool stubbed two advocates where production sends four, so a model
that could afford a paragraph per answer in screening wrote "Yes, correct."
under load. The stub is four now. Whether that is enough is unknown, and the
only thing that settles it is runs.

**If these two seats fail as well**, the answer is to revert to 0009 rather than
to screen a third round. Two rounds of replacement without a stable panel would
mean the pool of models this project can afford is not deep enough to seat seven,
which is itself a result worth recording.

### The five runs, same evening

They did not fail. Excluding four runs killed by an exhausted OpenRouter balance
— which produced no panel and whose surviving calls were truncated by the
provider, so they are contaminated rather than merely incomplete:

| Run | barak | elon | shamgar | Panel |
|---|---|---|---|---|
| 20:52 · 7/7 | justified | justified | not_justified | divided |
| 20:59 · 7/7 | justified | not_justified | not_justified | divided |
| 21:00 · 7/7 | justified | not_justified | not_justified | divided |
| 21:00 · 7/7 | justified | not_justified | not_justified | divided |
| 21:01 · 6/7 | justified | not_justified | not_justified | divided |

**34 of 35 calls succeeded. All three judges ruled in all five runs. The panel
divided in all five.** The single failure was grey_worm on
`/concedes/2 must NOT have fewer than 20 characters` — an advocate, not a judge,
and the panel was unaffected. Wall time 31–48s.

Against the allocation this replaced — 26% failures and shamgar absent from five
runs out of five — and against 0009's 1% over thirteen runs, this sits with 0009
rather than with what it replaced.

### An unplanned finding, and the more interesting one

Compare the per-judge leans across two allocations that share only barak's model:

| Judge | Under 0009 (13 runs) | Under 0013 amended (5 runs) |
|---|---|---|
| barak · same model both | justified ×10, not ×2 | justified ×5 |
| elon · flash-lite → mercury | not ×9, justified ×4 | not ×4, justified ×1 |
| shamgar · flash-lite → muse-glimmer | not ×13 | not ×5 |

**Each judge kept its lean when its model was replaced.** shamgar moved from a
Google model to a Meta one and still ruled `not_justified` every time; elon moved
to Inception and still leaned `not_justified` about four to one.

If this holds, it weakens the cost this decision was filed under. 0013 warned
that three judge models make divergence unattributable between method and model.
Five runs suggest the lean travels with the *method* — the prompt and the seat —
rather than with the model underneath it, which is the claim 0009's comparison
was originally read as ruling out.

**It is five runs and it is not a finding.** Three qualifications, none of them
decorative: barak is the same model in both columns and contributes nothing;
temperature is 0.7 and elon's 4–1 is well inside what a coin does in five throws;
and the two allocations differ on the advocate side as well, so the judges are
not reading identical input across the comparison. What would settle it is the
same panel with the judges' models permuted between seats. That is the
experiment this table is an argument for, not a substitute for.

---

## The decision

`modelMap()` (`src/config.js`) gives every seat its own model.

| Seat | Model | Vendor |
|---|---|---|
| advocate · jon_snow | `google/gemini-3.7-flash` | Google |
| advocate · tyrion_lannister | `google/gemini-3.8-flash` | Google |
| advocate · daenerys_targaryen | `google/gemini-3.6-flash` | Google |
| advocate · grey_worm | `qwen/qwen3.7-flash` | Qwen |
| judge · barak_model | `google/gemini-3.5-flash-lite` | Google |
| judge · elon_model | `inception/mercury-2.5-preview` | Inception |
| judge · shamgar_model | `nvidia/nemotron-3.5-lightning` | NVIDIA |

Two seats keep what 0009 gave them — `jon_snow` and `barak_model` — so that the
advocate finding and the judge measurements from turn 010 still have one column
each that is comparable across the change.

`TRIBUNAL_UNIFORM_MODEL` is unchanged and becomes more important, not less: see
*What it costs*.

## Why

Because it was asked for, on 8 September 2026, in those words: *"just have each
of them run a different model, and if there's currently not enough models look
for a new one to add to the list and we'll test it."*

That is the whole reason, and this record does not dress it as anything else.
There is no run behind it. 0009 named this exact experiment —

> **A different model per judge** — four providers, a genuinely mixed panel.
> Not chosen, and explicitly not ruled out. It is the interesting experiment and
> this turn does not have the runs to support it. Doing it now would mean
> committing an allocation on the strength of a guess, which is the thing this
> record exists to prevent.

— and listed *"a per-judge comparison with enough runs to separate three judge
models"* under **What would change this**. That comparison has not been run.
This decision does the thing 0009 declined to do, without the evidence 0009 said
it would take.

Recording that plainly is the point of writing it down. The alternative — a
record that reverse-engineers a rationale from the instruction — would make the
repository say the project reasoned its way here, and it did not.

## What it costs

**Divergence stops being attributable.** This is the real price and it falls on
the project's central claim. 0009 established, over 23 runs, that whether the
panel divides is a property of the *judge model*. With three judges on three
different models, a split can no longer be read as three methods disagreeing —
it may be three models disagreeing, and nothing in the output distinguishes
them. The three-column display (0002) still shows what each judge held; what it
can no longer support is the sentence "they differ because the methods differ".

Two things keep that recoverable rather than lost:

- `TRIBUNAL_UNIFORM_MODEL` flattens all seven seats onto one model. A uniform
  run and a mixed run on the same case is the only remaining way to ask the
  method-versus-model question, and it is now the *only* way, where before it
  was one of two.
- `model_map` is stored per run, so every archived proceeding says which
  allocation produced it and no earlier run is silently re-described.

**A wider failure surface.** Seven models is seven ways for a seat to fail
rather than two, from five vendors rather than two, each with its own capacity
and rate limits. On the screening day alone one candidate was 429'd twice inside
an hour by a provider having a bad afternoon. Expect more incomplete panels.

**The advocate side is three siblings.** `3.6`, `3.7` and `3.8-flash` are one
family. They satisfy "seven different models" and they are not seven different
*kinds* of model. That is deliberate — see below — but it is a real limit on
what the word "different" is doing here.

## Why the models sit where they sit

Seven distinct ids is satisfiable by seven models from one vendor, which would
defeat the purpose. So the distinctness is spent where it buys something:

- **The judges take the three most different models available**, one vendor
  each. The judges are where shared lineage would quietly manufacture agreement,
  and a panel that agrees by construction has nothing to report (0002).
- **The advocates take the near-siblings.** An advocate's seat already fixes
  that the case gets argued (0004); the advocate is not reaching an independent
  conclusion the way a judge is, so lineage matters less there.

A test asserts both: seven distinct ids, and three distinct vendors across the
judges. Both were verified by breaking them.

## What was rejected

- **`bytedance-seed/seed-2-1-turbo`** — works, and takes 99.6s, after two
  attempts were cut off at 45s. The advocates run concurrently, so the slowest
  advocate sets the length of the entire first stage. Offered in the picker,
  labelled slow, not given a seat.
- **`liquid/lfm-2.5-2.6b:free`** — works, and is a `:free` id. A test written in
  turn 008 has forbidden those since, on the grounds that free tiers rate-limit,
  and it failed the moment this was added. The rule was vindicated the same day
  by qwen3.8-flash's two 429s. Removed from the allowlist entirely.
- **Four candidates that failed screening** — `z-ai/glm-5.3-flash`,
  `ibm-granite/granite-4.2-8b`, `qwen/qwen3.8-flash`,
  `dots-studio/dots-3-note-preview:free`. Reasons and dates in
  `panel/models.json` under `$rejected`.

## What would change this

- **The per-judge comparison, run.** Enough runs on this allocation and on a
  uniform control to say whether the mixed panel still divides. If it does not —
  if three vendors produce the unanimity that uniform 3.7-flash produced in five
  runs of five — then this allocation has the defect 0009 rejected 3.7-flash for,
  and the status above should stop saying *provisional* and start saying
  *rejected*.
- Any seat failing often enough that seven models costs more complete panels
  than it buys distinctness.
- A finding that the three Gemini advocates behave as one, which would mean the
  advocate side is four models in name and two in fact.
