# Turn 005 — The case for the seat

Date: 31 August 2026
Branch / commit: `main`, clean at the start.

**One change.** Deliberately, after turn 004 did eight.

## 1. Intent

Turn 004's baseline found something worse than the judges converging: in three
runs of five, **every advocate reached the same position**, so the judges ruled
on a case only one side had been put in. Their agreement meant almost nothing.

Fix the adversarial process before touching the judges. Tuning judges while the
arguments reaching them are one-sided is working on the wrong layer.

## 2. Specification

Require every advocate to produce **the strongest case for its seat**, argued in
good faith from the agreed record, as a field separate from its own conclusion.

The constraint this had to respect: decision 0004 forbids requiring an advocate
to *conclude* in favour of its seat. So the seat fixes the **argument**, never
the position. Jon may still conclude he was not justified; he must construct the
defence first.

Fixed before writing:

- `case_for_seat` is required on every advocate opinion, 300–4000 characters.
- `position` stays free — `justified`, `not_justified` or `mixed`, whatever the seat.
- `argument` becomes *why this advocate personally lands there*, which may adopt
  the case above or depart from it.
- The judges must **receive** `case_for_seat`, first and labelled as the case to
  answer. A field the judges never see would change nothing.
- A gate: `case_for_seat` identical to `argument` fails the call.

## 3. Context supplied

`docs/evidence/004-baseline-compare.txt`, decision 0004, the four advocate
prompts, `schemas/opinion.schema.json`, `src/prompts.js`.

## 4. Plan

Schema, gate, judge message, four prompts to v1.2, stub, tests. Approved unchanged.

## 5. Execution

`schemas/opinion.schema.json` — `case_for_seat` required for advocates, with the
reason written into the field description.
`src/gates.js` — the copied-case check, normalised for whitespace and case.
`src/prompts.js` — judges now receive the case for each seat **before** the
positions, and are told when an advocate departs from its own seat that *the
case still stands to be answered*.
`prompts/advocate-*.md` — v1.2. The single-paragraph "Your seat" section became
"Your seat, and the two things it asks of you".
`src/providers/stub.js` — a `copied_case` mode.
`tests/gates.test.js` — 31 → 35.
`CLAUDE.md` — the settled decision now reads "the seat does not fix the position
— but it does fix that the case gets argued".

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| An advocate opinion without `case_for_seat` is rejected | Test | Pass |
| `case_for_seat` copied from `argument` is rejected | Test, including a whitespace-and-case variant | Pass — the cheapest way to fake a steelman is to paste your own argument in |
| Decision 0004 is untouched | Test: a defence advocate concluding `not_justified` with a valid `case_for_seat` passes | Pass |
| The judges actually receive both cases | Test asserts the assembled judge message contains "THE CASE FOR THE DEFENSE SEAT" and the prosecution equivalent | Pass |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 35 tests |

### 6a. What three real runs showed

Filed with the turn 008 evidence; the compare table is in
`docs/evidence/004-baseline-compare.txt` (last three rows).

**Every post-005 run is contested.** `cases: both` on all three, and all three
show positions differing. The one-sided panels stopped.

**Jon Snow changed his mind.** In all eight runs before this change he concluded
`not_justified` — about his own act, from the defence seat. In all three runs
after it, `justified`. The only difference is that he now builds the defence
case before stating his position.

That is either the steelman doing exactly what a steelman is for, or an ordering
effect — constructing an argument primes the conclusion that follows it. Three
runs cannot separate those, and the second possibility is worth holding onto:
if it is priming, then `case_for_seat` is not only restoring the adversarial
process, it is also biasing `position`, which decision 0004 wanted left free.

**Barak moved with it.** Ruled `justified` once in five runs before; twice in
three after. Elon stayed `not_justified` eight for eight, Shamgar seven for
seven. That fits the baseline reading: Barak's method weighs the defence case,
theirs turn on formal authority, which no defence argument touches.

**No new failures.** `case_for_seat` cost about 10% more input tokens and
nothing else. Tyrion also produced `mixed` for the first time — the third enum
value had never been used.

### What I did not verify

- **Whether the position shift is causal.** Three runs. See above; this is the
  open question the change created and it is not yet answered.
- **Whether `case_for_seat` is actually argued in good faith.** The gate catches
  a verbatim copy. It cannot catch a deliberately weak steelman, which is the
  failure that would matter, and no gate can — that is a human read.
- **The copied-case gate on real output.** It has fired only on the stub.
  Written, unproven.

## 7. Outcome

**Locked:** every advocate argues its seat's case. The judges see both cases
whatever the advocates conclude. Decision 0004 survives intact — the seat still
does not fix the position.

**Open:** whether the position shift is the steelman working or priming. The
judge-method-structure question, deliberately still untouched.

**Next turn:** the app.
