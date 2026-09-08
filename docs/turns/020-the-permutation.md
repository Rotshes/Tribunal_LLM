# Turn 020 — The permutation

Date: 8 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Turn 019 left one question open, and it is the question decision 0013 was filed
around: when three judges run three different models and the panel divides, is
that the judicial method disagreeing or the models disagreeing? Nothing in the
output distinguishes them.

Five runs had suggested the lean travelled with the *seat*. That was suggestive
at best — barak was the same model in both columns being compared.

## 2. Specification

A Latin square. Three conditions; each of the three judge models sits each of
the three judge seats exactly once. **The advocates never change**, so every
condition feeds the judges comparable input and the only variable is which model
occupies which chair.

Written into 0013 *before the runs*, along with what each outcome would mean —
including that scatter was the most likely result and would mean the five-run
pattern had been noise. Stated in advance so it could not be reinterpreted
afterwards.

## 3. Context supplied

Decision 0013 and its amendment, the 9-run table from turn 019, and
`src/config.js`.

## 4. Plan

Add a per-seat CLI override → run four of each new condition → read the result
by seat and by model, both.

## 5. Execution

`--seat <role>=<model>`, repeatable, parsed by `parseSeatFlags()` in
`src/config.js` and validated by the same `resolveModelMap()` allowlist check the
browser goes through. Coming from a terminal buys no exemption. `model_map` is
stored per run, so `npm run compare` grouped the three conditions as three
configs without being told to.

### The result

Fourteen runs, 36 judge opinions. By seat:

| | barak's seat | elon's seat | shamgar's seat |
|---|---|---|---|
| **I** flash-lite / mercury / muse-glimmer | 5 / 0 | 1 / 4 | 0 / 5 |
| **II** mercury / muse-glimmer / flash-lite | 3 / 1 | 0 / 3 | 0 / 3 |
| **III** muse-glimmer / flash-lite / mercury | 0 / 3 | 1 / 2 | 1 / 4 |
| **by seat** | **8 / 4 — 67%** | **2 / 9 — 18%** | **1 / 12 — 8%** |

By model:

| Model | justified | not_justified | |
|---|---|---|---|
| `gemini-3.5-flash-lite` | 6 | 5 | 55% |
| `mercury-2.5-preview` | 5 | 9 | 36% |
| `muse-glimmer-30b` | **0** | **11** | **0%** |

**Both effects are real.** The seats order the leans — 67 / 18 / 8, monotone, and
it held in all three conditions. And a model can override that ordering:
muse-glimmer returned `not_justified` in eleven opinions out of eleven and is the
only model that ever flipped barak's seat.

I predicted scatter as most likely. It is not scatter. It is structure with one
exception, and the exception is the interesting half.

### What it settles, and what it does not

**Settled for this allocation:** barak's justified and shamgar's not_justified
both reproduce when the models underneath them are moved, so in the committed
seven the divergence is attributable to the method. That is the cost 0013 was
filed under, and it does not bite here.

**Not settled in general:** a model with a strong enough prior flattens the seat
effect. Seat one and the panel's divergence becomes that model's opinion wearing
a method's name. 0013 now carries a standing obligation to re-check this whenever
a judge's model changes.

### A fifth value the model was being asked for

`/case_id must be string` failed twice on barak's seat during these runs. The
cause is the project's own standing rule, broken in the one place nobody had
checked: **`case_id` was on the log row from the beginning and never attached to
the opinion**, so the validated object took whatever the model typed.

Provenance, the disclaimer, `representative_id`, the method — and now this. Fixed
the same way as the other four: the runner attaches, the model supplies only the
reasoning.

## 6. Verification

77 tests pass. `npm run check` clean over 106 files (G5, G8, G9).

Two new tests, each verified by breaking it:

| Test | Broken by | Fired |
|---|---|---|
| `--seat` parses, repeats, and cannot bypass the allowlist | asking for `anthropic/claude-opus-5` | yes — refused, seat kept its committed model |
| `case_id` is attached, not requested | removing the attachment line | yes — all seven calls fail G2 |

The `case_id` test uses a provider that returns a deliberately wrong `case_id`
(`12345`, not a string and not this case). If the runner attaches, the run
completes and every stored opinion carries the case's own id.

**A false positive in my own test, caught rather than believed.** The first
version of that provider destructured `{ role, roleId }` and forwarded only
those, silently dropping `model`. The run failed — but for a reason with nothing
to do with `case_id`. Had I taken the red as confirmation, I would have "proved"
a fix that did nothing. Same lesson as the four in `CLAUDE.md`: check what the
failure is, not that there is one.

### Not verified

- **Any single cell.** `2 / 9` and `1 / 12` are the same claim at n=14.
- **muse-glimmer's 0 of 11.** A model that never once returns one of two
  permitted values is either heavily biased or misreading the task, and this
  design cannot tell those apart. The strongest number here and the one most
  worth re-testing.
- Whether the seat ordering survives a different case. Everything here is T-001.
- The advocates were held fixed by design, so nothing here says anything about
  whether the advocate models matter.

## 7. Outcome

Done: `--seat` and its test, the permutation run and read both ways, 0013
carrying the result, `case_id` attached and tested.

Open: the charge-sheet form (DoD 1, still PARTIAL), the evidence copies for turns
019 and 020, and the final Netlify deploy before the submission email.
