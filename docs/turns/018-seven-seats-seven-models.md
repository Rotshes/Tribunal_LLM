# Turn 018 — Seven seats, seven models

Date: 8 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Four asks, delivered in two messages.

1. The Convene button "blended into the background" — make it apparent.
2. A simpler font.
3. Remove the unreliable and known-to-fail models from the picker.
4. Give each of the seven seats a different model, *"and if there's currently
   not enough models look for a new one to add to the list and we'll test it."*

Then, on running the first screening command: **"it gets stuck with the first
command."**

## 2. Specification

- The Convene button is the widest, heaviest thing on the page until rulings
  arrive, and reads as a control rather than as a link.
- One typeface across the whole page.
- The picker offers only models observed to work. Nothing is deleted from the
  allowlist — archived runs that used a failing model must still resolve.
- `modelMap()` returns seven distinct model ids, each on the allowlist, each
  observed to work. Verified by a test that fails when the condition is broken.
- Anything the allocation change costs the project's claims is written down
  before the code is committed, not after.

## 3. Context supplied

`panel/models.json` (six entries, two of them failing), decision 0009, the
timing rules in `CLAUDE.md`, and OpenRouter's model catalogue for candidates.

## 4. Plan

Screen candidates one call at a time with `npm run try-model`; add only what
passes; then write the allocation, supersede 0009, and record the cost.

## 5. Execution

### The tool was the thing that was stuck

Roy's *"it gets stuck"* was a defect in `tools/try-model.js`, not necessarily in
`z-ai/glm-5.3-flash`. The tool printed **nothing** between invocation and result
and carried a 120-second timeout inherited from the deliberation path, where a
background function has fifteen minutes. Two silent minutes is indistinguishable
from a hang, and the person waiting has no way to tell which they are looking at.

Fixed with a moving counter (`waiting 12s`, rewritten in place each second), the
model id printed before the call rather than after it, and a default timeout of
45s with `--timeout <seconds>` to override.

**The 45 was then wrong, and admitting that mattered more than defending it.**
Three candidates came back "no answer within 45s". That is not a verdict — the
deliberation is a background function now (0011), so a 70-second model is usable,
and "cut off at 45s" does not distinguish *slow* from *dead*. Re-ran the three at
`--timeout 120`, which separated them cleanly: glm was still silent at 120s
(dead), granite answered at 46.1s (slow, and failed for an unrelated reason),
seed answered at 99.6s (slow, and correct). Two of those three verdicts would
have been wrong on the 45s data alone.

### Eight candidates screened

| Model | Result |
|---|---|
| `z-ai/glm-5.3-flash` | silent at 45s **and** at 120s — rejected |
| `ibm-granite/granite-4.2-8b` | valid JSON in 46.1s, `grounds[0]` over the 400-char cap — rejected |
| `qwen/qwen3.8-flash` | OpenRouter 429, twice in an hour — rejected |
| `dots-studio/dots-3-note-preview:free` | silent at 45s, not retried — rejected |
| `bytedance-seed/seed-2-1-turbo` | works, 99.6s — **added, not seated** |
| `google/gemini-3.8-flash` | works, 26.8s — **added and seated** |
| `google/gemini-3.6-flash` | works, 34.8s — **added and seated** |
| `inception/mercury-2.5-preview` | works, 6.2s — **added and seated** |
| `liquid/lfm-2.5-2.6b:free` | works, 38.9s — **added, then removed** (below) |

### A test from turn 008 overruled me

Adding the Liquid model turned a green suite red: *"`liquid/lfm-2.5-2.6b:free`
is a free tier and will rate-limit."* A test written ten turns ago forbids
`:free` ids on the reasoning that free tiers throttle.

It was right, and it was vindicated the same afternoon by `qwen3.8-flash`
returning 429 *"temporarily rate-limited upstream"* twice within the hour. A
model that passes a one-call screen and 429s under a seven-call run is worse
than no model, because it fails intermittently rather than plainly. Removed from
the allowlist; the observation is kept under `$rejected` with a note that this
is the only entry rejected for something other than what it did when called.

Worth naming: I did not reason my way to this. A gate did, and the correct
response to a gate you did not expect is to check whether it is right before
looking for a way around it.

### The allocation

Seven distinct ids, placed rather than dealt:

| Seat | Model | Vendor |
|---|---|---|
| jon_snow | `google/gemini-3.7-flash` | Google |
| tyrion_lannister | `google/gemini-3.8-flash` | Google |
| daenerys_targaryen | `google/gemini-3.6-flash` | Google |
| grey_worm | `qwen/qwen3.7-flash` | Qwen |
| barak_model | `google/gemini-3.5-flash-lite` | Google |
| elon_model | `inception/mercury-2.5-preview` | Inception |
| shamgar_model | `nvidia/nemotron-3.5-lightning` | NVIDIA |

The judges hold three vendors because the judges are where shared lineage would
manufacture agreement, and a panel that agrees by construction has nothing to
report (0002). The advocates hold the near-siblings because the seat already
fixes that the case gets argued (0004). `jon_snow` and `barak_model` keep the
models 0009 measured, so one advocate column and one judge column stay
comparable across the change.

### What this costs, stated before committing it

Decision 0009 named a per-seat allocation as "the interesting experiment",
declined it for want of runs, and listed a per-judge comparison under *What
would change this*. **That comparison has not been run.** 0013 does the thing
0009 declined, without the evidence 0009 said it needed, because Roy asked for
it — and says exactly that rather than reverse-engineering a rationale.

The price is that a split in the panel can no longer be attributed to the
judicial method rather than to the model. 0009 established over 23 runs that
divergence is a property of the judge model; three judge models make method and
model inseparable in the output. `TRIBUNAL_UNIFORM_MODEL` is now the only way
left to ask that question, and `model_map` per run keeps archived proceedings
correctly described. 0013 is filed as **provisional** for this reason.

### The three smaller asks

Solid ink button with a rubric offset shadow, `min(720px, 100%)` wide (turn
017's outlined ghost was the wrong instinct). Newsreader dropped from
`web/index.html` and `styles.css`, leaving Archivo alone. `offeredModels()`
filters the picker to entries whose `observed` starts with `works`, while
`allowedModels()` and `allowedIds()` stay complete so stored runs still resolve.

`modelHealth()` gained a third state, `works (slow)`, for Seed 2.1 Turbo — it is
offered, it answers, and it takes about a minute. The advocates run
concurrently, so one slow advocate sets the length of the entire first stage.
That cost is now on screen; nothing else would have shown it.

## 6. Verification

**74 tests pass; `npm run check` clean over 103 files (G5, G8, G9); `npm run
build` succeeds.**

Three new tests, each verified by breaking it rather than by reading it:

| Test | Broken by | Fired |
|---|---|---|
| seven seats, seven distinct models | pointing two seats at one model | yes |
| judges hold three vendors | putting all three judges on Google | yes |
| seats run models observed to work | seating `upstage/solar-pro4` | yes |
| an override cannot alter the allocation | returning `SEAT_MODELS` unspread | yes |

The last one is a real bug this turn nearly shipped. `resolveModelMap()` writes
overrides into the object it is handed; returning the module-level constant
would have let one visitor's model choice become every later visitor's default
for the life of the process — visible only on the deployed site, under
concurrent traffic, never once locally.

**One existing test was rewritten rather than relaxed.** The turn-010 test
asserted the *old* shape — four advocates on one model, three judges on another.
Under 0013 that is false, and a test edited until it passes under both
allocations would not be testing the allocation. It was replaced.

**A second existing test had hardcoded the allocation** (`assert.equal(ok.map
['judge.elon_model'], 'google/gemini-3.5-flash-lite')`) while actually testing
something else entirely — that an override does not leak onto other roles. It
broke for a reason unrelated to its purpose. Now derived from `modelMap()`.
Same lesson as the two-statements-of-one-contract group in `CLAUDE.md`: a test
that restates a value it does not own breaks when the value moves.

### Not verified

- **No deliberation has been run on this allocation.** Not once. Every model in
  it passed a *single* judge-role screening call; four of the seven have never
  been called in an advocate role at all, and the four-then-three concurrency of
  a real run has not been exercised with these models. The next paid run is the
  first real evidence this turn produces.
- **Whether the mixed panel still divides** — the open question, and the one
  that decides whether 0013 stays.
- Prices are from OpenRouter's API on 08.09.2026 and are per *standard*
  endpoint. `gemini-3.6-flash` alone quotes 0.375, 0.75 and 1.35 across its
  endpoints; the picker shows one number for something that is not one number,
  and `$price_note` says so.
- The React changes were checked by build and by test, not in a browser.

### An open question for Roy

`ibm-granite/granite-4.2-8b` was rejected for exceeding `grounds[].maxLength`
of 400 characters. `schemas/` is a stop-and-ask file, so nothing was changed —
but this is the shape of a defect that has bitten this project before: turn 013
records *"a 600-character cap discarding a whole judge opinion — a bound tight
enough to reject good output is a bug in the bound."* Whether 400 is right is
your call, not mine. The model may have been verbose; the cap may be tight.

## 7. Outcome

Done: the button, the font, the filtered picker, eight models screened, five
added, one removed by a gate, the seven-seat allocation, decision 0013, 0009
superseded, `CLAUDE.md` updated and back at exactly 200 lines.

Open: the first run on this allocation, and the comparison that settles whether
0013 is provisional or wrong.
