# Turn 024 — A case may bring its own advocates

Date: 9 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Turn 023 found that the form shipped in turn 021 could produce a charge sheet
the app could not run. Roy asked whether new characters with a new case is
actually required. It is, twice over:

**Decision 0003**, accepted 24.08.2026:

> The domain is adopted **as data**, not as code… Nothing else does — not the
> schema, not the backend, not the database, not the interface.
>
> …the prompts are per-representative, so **a new case means new representatives
> means new prompt files**, which is honest rather than wasteful.

**Definition of done, item 1:** *a **stranger** can open a public web address,
submit a charge sheet… and read the opinions.*

Those two cannot both hold as written. 0003's answer to a new case is "write new
prompt files", which a maintainer can do and a stranger cannot. Roy chose the
resolution: a fallback prompt for representatives nobody has written one for.

## 2. Specification

- A charge sheet naming any four representatives runs, end to end.
- The four named advocates keep their own prompt files, unedited.
- **A case may not invent a judge.** The three are the panel's method, fixed by
  the schema's `judge_id` enum.
- The fixed-advocate-order property survives (`docs/01-spec.md` §3).

## 3. Context supplied

Decision 0003, `docs/00-framing.md` §3, `schemas/charge-sheet.schema.json`,
`src/config.js`, `src/prompts.js`, `src/deliberate.js`, `prompts/advocate-jon-snow.md`.

## 4. Plan

Find every place that names T-001's four → make each take them from the case
instead → add one prompt file → tests that fail when any of the three is undone.

## 5. Execution

### Three places named the characters, not one

The defect was wider than the prompt file:

1. **`ADVOCATE_ORDER`** — a constant of four ids that `deliberate.js` iterated.
   A case with other representatives asked for advocates it did not have.
2. **`PROMPT_FILES`** — one file per id; an unknown id threw.
3. **`modelMap()`** — keyed `advocate.jon_snow` and so on, so a new advocate had
   no model at all.

All three are the backend naming characters, which 0003 says nothing does. The
contradiction predates the form; turn 021 only made it reachable.

`advocateOrder(caseObj)` now takes the ids from the case, in the case's own
order. **The property that mattered is kept**: §3 wants a stable order so an
ordering effect is detectable across runs, and a case's `representatives` array
is stable because the charge sheet is immutable. *Fixed per case* was the
property; *fixed to four particular people* never was.

`modelMapForCase()` re-keys the committed allocation by **position** — the
case's first advocate takes the model committed to the first advocate seat. That
follows from 0013: since seven seats got seven models, the allocation has been
about seats rather than about people.

### The generic prompt, and what it gives up

`prompts/advocate-generic.md` v1.0, reached only when `PROMPT_FILES` has no
entry. Every structural section is the same as a character prompt — the two
things the seat asks for, the record, the scope, the output contract. What
changes is *Who you are*: it takes the manner of arguing from the `brief` in the
charge sheet, and says so.

Written into the file rather than left implied:

> A character prompt carries a voice… This one has to take that from the `brief`
> in the charge sheet, which is 100–1200 characters written by a submitter. The
> argument will be flatter and less particular than one from a hand-written
> prompt.

**There is deliberately no generic judge.** A case supplies parties; it does not
supply the panel's method.

The brief now travels in the user message for **every** advocate, inside turn
023's fence, because it is case data. For the four named advocates that
duplicates what their prompt already says — deliberate and harmless: the prompt
is the voice, the brief is the record.

### The fixture was naming characters too

The first version of the test failed with every judge call rejected by G2b. The
cause was in `src/providers/stub.js`: `respondTo = ['jon_snow', 'grey_worm']`,
hardcoded. With any other case the stub had its judges answering advocates who
were not in it.

Worth recording because of what it nearly cost: **the fixture's defect looked
exactly like the app's**, and the obvious reading of a red test was that the fix
had not worked. It had. The stub now takes one advocate per seat from the case.

## 6. Verification

**88 tests pass. `npm run check` clean over 116 files.**

| Test | Broken by | Fired |
|---|---|---|
| a submitted case with new representatives runs | removing the generic fallback | yes |
| … | reverting `advocateOrder` to the fixed four | yes |
| … | dropping the positional model mapping | yes |
| a case cannot invent a judge | removing the fallback (it then throws for advocates too) | yes |

The first test asserts the whole path on a case named `T-777` with four invented
representatives: 7/7 complete, the case's order preserved, each advocate given
its own brief, the generic system prompt in use, and every seat allocated a
model by position.

### Not verified

- **No submitted case has been run against real models.** The generic prompt has
  never produced a real argument, so the flatness it warns about is predicted,
  not measured.
- Whether a 100-character brief is enough to argue from at all. The schema's
  floor allows one; nothing has tried it.
- The four character prompts' `## User (assembled by the backend)` blocks still
  document the pre-fence shape (turn 023's open item). The generic prompt
  documents the current one, so the seven files now disagree with each other as
  well as with the code. **Still Roy's call, and now more visible.**

## 7. Outcome

Done: `advocateOrder`, `modelMapForCase`, the generic prompt and its fallback,
the stub's characters removed, four tests.

Definition-of-done item 1 now holds for any charge sheet the schema accepts,
rather than only for one that reuses T-001's four names.

Open: the seven prompt files' user blocks; a real run on a submitted case; the
final deploy.
