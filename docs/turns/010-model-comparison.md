# Turn 010 — The model comparison, and what it cost the design

Date: 31 August 2026
Branch / commit: `main`.

## 1. Intent

The last open item from the running-project requirements: move from one model on
all seven calls to a per-role allocation, as a diff to `modelMap()` plus a
decision record citing the logs. `src/config.js` has said since turn 001 that
this is how the change must arrive.

The plan was small — run a second model, compare, commit the allocation. It did
not survive contact with the second condition.

## 2. Specification

- At least one condition on a second model, on the same case, same prompts,
  same temperature, with every run in the record.
- The comparison must be able to say **which layer** an outcome comes from, not
  only that changing the model changed something.
- The allocation lands as a diff plus a decision record, not as an `.env` value.
- No claim in the record that the runs do not support.

## 3. Context supplied

`tools/compare.js` output after each condition, `src/config.js`,
`panel/models.json`, and turn 009's finding that the record is the union of
local files and Supabase.

## 4. Plan

1. `--advocates <model>` / `--judges <model>` on the CLI, so a whole layer can
   move at once. The browser picker sets seven roles individually, which is
   right for a visitor and wrong for an experiment: the question is which layer
   drives the outcome.
2. Condition 2 — 3.7-flash on all seven, 5 runs.
3. Condition 3 — chosen *after* reading condition 2, to attribute it.
4. Allocation diff + decision record.

## 5. Execution

`src/cli.js` — the two layer flags, validated against the same allowlist the
browser is (`allowedIds()`); a terminal does not get to bypass the check.

The record holds **26 runs** of T-001. Twenty-three of them are the three
conditions compared here; the other three are turn 004's `--json-mode off`
runs, which failed 6 of 21 calls and are excluded for that reason rather than
quietly dropped.

| Condition | Runs | barak | elon | shamgar | failures |
|---|---|---|---|---|---|
| flash-lite everywhere (turns 003–009) | 13 | justified ×7, not ×6 | not ×12, justified ×1 | not ×12, absent ×1 | 1 of 77 |
| 3.7-flash everywhere | 5 | justified ×5 | justified ×5 | justified ×5 | 0 of 35 |
| 3.7-flash advocates, flash-lite judges | 5 | justified ×3, not ×2 | not ×4, justified ×1 | not ×5 | 0 of 35 |

The first row's denominator is 77, not 91: two of its thirteen runs came through
the browser before turn 009 added the timing and call-count columns, so they
carry no counts. Thirteen runs, eleven of them counted.

Wall clock: condition 2 ran 26.9–34.5s, condition 3 ran 15.0–27.9s. Output
tokens for condition 3 fell between the two uniform conditions (~11–13k).

Evidence: `docs/evidence/010-compare-three-conditions.txt`.

Then `src/config.js`: advocates on `google/gemini-3.7-flash`, judges on
`google/gemini-3.5-flash-lite`. `TRIBUNAL_MODEL` retired,
`TRIBUNAL_UNIFORM_MODEL` added for control runs.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| A second model measured on the same case | 5 runs, condition 2 | Pass |
| The comparison attributes the outcome to a layer | Condition 3 isolates the judge layer | Pass |
| The allocation is a code diff, not configuration | `modelMap()` + decision 0009 | Pass |
| Both advocate and judge models are on the allowlist | New test asserts it | Pass |
| The layers actually differ, and stay differing | New test asserts `advocate ≠ judge` | Pass |
| A retired `TRIBUNAL_MODEL` cannot silently apply | New test; runner prints a warning | Pass |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 48 tests, 74 files, G5 and G8 clean |
| The evidence file is readable by anyone cloning the repo | `file` on the committed artifact | Pass after §7a — UTF-8, LF, no escape codes |
| A run records the allocation it used | Stub run, `model_map` read back from the persisted document | Pass — four advocates 3.7-flash, three judges flash-lite, `model: null` |
| The committed allocation works against real models | Live run `cbdf1b97`, no overrides | Pass — 7 of 7, no gate problems, `model_map` and all seven per-call `model` fields carry the two models |

### 6a. The second condition produced the one result the design has no use for

Uniform 3.7-flash: **five runs, fifteen opinions, one answer.** `justified`,
every judge, every time.

Three judges are given deliberately different methods, receive identical input,
and never see each other. That arrangement is load-bearing — it is the only one
in which divergence means anything. On the more capable model it produced a
panel that could not divide, which is a single opinion printed three times in
three columns.

The comfortable reading was available and I nearly wrote it: better advocates
produce arguments clear enough that any competent judge lands in the same place.
Condition 3 was run to test it, and I said beforehand what would falsify it —
if the split returned with flash-lite judges under 3.7-flash advocates, the
divergence is a judge-model property.

**It returned**, and it returned to flash-lite's own pattern: barak divided,
elon and shamgar overwhelmingly `not_justified`. Advocate quality changed
neither the direction nor the shape of the disagreement.

So the honest statement of what this project's panel shows is narrower than the
design implies. The three judges do not divide *because their methods differ* —
not demonstrably. They divide because a smaller model is less consistent, and
the methods decorate a variance the model was going to produce anyway. That is a
finding about the tribunal, not just about a model, and it belongs in the record
at full strength rather than as a caveat under a table.

### 6b. The advocate rows say it directly, without the inference

§6a argues from the judges. The compare tool's advocate section makes the same
point without an argument, and I did not notice it until the evidence file was
read back.

Across **all ten** runs of conditions 2 and 3, the four advocates concluded
identically: `jon_snow: justified`, `tyrion_lannister: justified`,
`daenerys_targaryen: not_justified`, `grey_worm: not_justified`, with both cases
argued in every run. One `mixed` from jon_snow in one run is the only wobble.

The same advocate positions, in the same order, produced three unanimous
`justified` rulings under 3.7-flash judges and a divided panel under flash-lite
judges. The judges were not reacting to different arguments. They received the
same conclusions and split anyway in one condition and not the other.

That is stronger than §6a's reasoning, because it does not depend on treating
"advocate model" and "argument quality" as the same thing. Whatever the
advocates changed between the two conditions, it was not their positions.

### 6c. Choosing to keep the divergent panel is a choice, and it is recorded

The allocation now deliberately puts the *weaker* model on the layer whose
output the whole interface exists to display. Stated plainly, that reads badly,
which is exactly why it is stated plainly: the alternative is an app whose three
columns are a formality, and either way the reader is entitled to know which
trade was made and on what evidence.

### 6d. The committed allocation, on real models

Run `cbdf1b97`, no flags, no overrides — the first deliberation the committed
map has produced. Evidence: `docs/evidence/010-run-e-committed-allocation.json`.

- **7 of 7 calls, no gate problems.** 3.7-flash routes cleanly on the advocate
  roles as a default, not only as an override. The `require_parameters` concern
  was unfounded, but it was worth one run to know rather than assume.
- **The allocation is legible in the record.** `model_map` holds both models and
  each of the seven call rows carries its own `model`; `model` at the top of the
  document is `null`, which is correct — there is no single model for this run
  and a field that pretended otherwise would be the lie this change was designed
  to avoid.
- **The panel divided.** barak `justified`, elon `justified`, shamgar
  `not_justified`. This is the outcome the allocation exists to make possible
  and the uniform 3.7-flash condition could not produce in five attempts.
- **20.8s wall against 66.1s of model time — a 3.18× concurrency gain**, and
  faster than every uniform 3.7-flash run (26.9–34.5s), which was the incidental
  argument for the mix.

One thing in it is not what the earlier conditions would predict: **elon ruled
`justified`.** Across the nineteen runs with flash-lite judges before this one,
elon returned `not_justified` sixteen times. It is now three of twenty. That is
not a contradiction — it is the variance decision 0009 says the sample cannot
call — but it is a reminder that "elon rules not_justified" was never a finding,
only a frequency.

### What I did not verify

- **That flash-lite's judges divide for good reasons.** Nothing here inspects
  the reasoning behind a split — only which ruling came back. A panel that
  divides arbitrarily and a panel that divides because barak's proportionality
  test genuinely cuts differently are indistinguishable in this table. Reading
  the opinions is the next turn's work, not this one's claim.
- **That advocate quality improved.** Not measured. The advocate half of the
  allocation rests on where past defects came from, which is an argument about
  risk, not a demonstration.
- **Stability of any of it.** 5 runs per condition at temperature 0.7.
  Condition 3's barak split 3–2, which this sample cannot call.
- ~~**The allocation against real models.**~~ Closed by run `cbdf1b97`; see §6d.

## 7. Outcome

**Locked:** the per-role allocation, committed in code with decision 0009 behind
it and verified on real models. The last open running-project requirement is
met. The layer flags make the experiment repeatable.

**Open:** decision 0007 is still marked DRAFT. G3 has still never fired — 73 of
74 judge opinions cite all five facts and the seventy-fourth cites one, so the
gate has never had an out-of-range index to catch. RLS has no read policy, so
DoD item 3 is not met. Deployment.

Also open, and small: the `model` column truncates at 30 characters, so every
condition-3 row reads `mixed: elon_model=google/gemin`. The full allocation is
in the variance section below it, so nothing is lost — but the table alone
cannot tell two different mixed allocations apart.

**Next turn:** deployment, or reading the opinions behind the splits. The second
is more interesting and the first is on the definition of done.

### Correction issued this turn

**Say what would falsify the reading before running the condition that tests
it.** It worked here — the prediction was written down, the run contradicted the
comfortable interpretation, and there was no room left to retrofit a story onto
the result. The failure mode it guards against is the one in the pitfalls
already: concluding from too little, then defending the conclusion.

### 7a. The evidence file was written twice

`npm run compare > docs/evidence/010-compare-three-conditions.txt` produced a
file, and the file was wrong: PowerShell's `>` writes **UTF-16 with a BOM**, and
every colour escape in the tool landed in it as literal bytes — 124 of them.

Git treats UTF-16 as binary. The evidence for this turn's central claim would
have committed as an undiffable blob that renders as mojibake on GitHub, and the
first person to notice would have been whoever tried to read it. The file
existed, the command exited cleanly, and nothing said anything was wrong. Same
shape as the three `compare` defects in turn 009: an output that looks like an
answer.

The first fix I wrote was a better redirect command. It was wrong, and wrong in
the way this repository keeps catching: the colour escapes come from the tool,
so **no shell** produces a clean file, and swapping `>` for `Out-File` would
have fixed the encoding while leaving 124 escape codes in the evidence.

So the tool does it. `tools/capture.js` mirrors console output to a file as
plain UTF-8 with LF and no escapes; `npm run compare -- --out <file>` uses it.
Two tests, one of which is this defect written from the failing side. The
existing file was rewritten in that form.

The general shape, and it is the fourth instance: **a step that gets done by
hand every turn should be done by the tool.** Decision 0007 makes producing an
evidence file routine, and routine work handed to a shell picks up the shell's
defaults — which differ per machine, which is exactly what `.gitattributes`
exists to stop.

### Housekeeping

`CLAUDE.md` points at `docs/turns/TEMPLATE.md`, which does not exist. Ten turn
records have been written to a shape carried between them by hand.
