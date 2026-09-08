# 0013 — Seven seats, seven models

Status: **provisional.** Accepted on instruction (Roy, 8 September 2026);
adopted before the comparison that 0009 said this change would need.
Date decided: 8 September 2026
Date written: 8 September 2026
Supersedes: `0009-advocates-and-judges-run-different-models.md`
Evidence: `docs/turns/018-seven-seats-seven-models.md`, and the eight screening
calls it records.

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
