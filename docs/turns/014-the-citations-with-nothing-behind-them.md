# Turn 014 — The citations with nothing behind them

Date: 31 August 2026
Branch / commit: `main`. Live at `subtle-axolotl-3f3681.netlify.app`.

## 1. Intent

Roy asked whether anything was left. Rather than answer from memory — which is
how this project has been wrong before — I audited the record against
`docs/PRE-SUBMISSION.md`: turn records present, decision records present,
nothing still marked DRAFT, evidence matching what is cited, `CLAUDE.md` under
200 lines.

The first thing the audit turned up is the worst defect in the repository.

## 2. Specification

- Every decision this repository cites has a file.
- The check is mechanical, because a person following eighteen links is a
  person who will not.
- Anything written late is labelled as written late.

## 3. Context supplied

`docs/PRE-SUBMISSION.md`, the contents of `docs/turns/`, `docs/decisions/` and
`docs/evidence/`, and `tools/repo-checks.js`.

## 4. Plan

Audit → write the check → let it produce the list → fix what it finds → record.

## 5. Execution

### The defect

**`docs/decisions/0001` and `docs/decisions/0002` did not exist.**

Between them they were cited **eighteen times**: by `CLAUDE.md`'s settled-decisions
list, `schemas/opinion.schema.json`, `src/config.js`, `src/deliberate.js`,
`tools/compare.js`, `db/schema.sql`, `web/index.html`, the README, and eight turn
records.

`0002` is the non-combination rule. It is the project's central claim — the
thing the schema, the database's missing column, G5, the renderer and the whole
argument of the app exist to enforce — and for thirteen turns there was no file
saying why, or what it was chosen over.

Nobody noticed because every citation looked authoritative. `(0002)` after a
sentence reads as a source. It was a dangling pointer in prose.

### The check

**G9**, in `tools/repo-checks.js`: every `docs/decisions/NNNN-…` path and every
`(00NN)` shorthand in the repository must resolve to a file. It found both
immediately, and one false positive — `(1300)`, a character count in a test —
which is why the bare-reference pattern is limited to `00NN`. A check that
invents work gets switched off.

### The records

`0001 — Every model call is logged, failures included` and
`0002 — The three rulings are never combined`, written in the same form as the
others: the decision, what it was chosen over, what it costs, what it buys, what
would change it.

Both carry **"Date decided" and "Date written" as separate lines**, and a note at
the foot saying the record was written on 31 August. Backdating them to look
contemporaneous was available and is exactly what decision 0007 forbids for
runs. The same principle applies to 0007's own siblings.

`docs/GRADING-MAP.md` — the deployment rows. DoD 1 and DoD 3 are now **DONE at a
public address** rather than "done locally"; the interface, HTTP wrapper and
gate rows updated.

`tests/gates.test.js` — 66 → 68.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| G9 catches a citation with no file | Test runs the real checker in a temp directory against `(0002)` with an empty decisions folder | Pass — and passes once the file exists |
| G9 does not flag a number that is not a decision | Test asserts the pattern is limited to `00NN` | Pass — after `(1300)` was flagged |
| Every decision cited in the repo now resolves | `npm run check` | Pass — 84 files |
| Every turn has a record | `ls docs/turns/` against the turn numbers | Pass — 001–014, no gaps |
| No decision record marked DRAFT | Search | Pass — 0007 accepted in turn 011 |
| `CLAUDE.md` under Module 11's limit | `wc -l` | Pass — 200 |
| The evidence file is complete | Re-run after waking Supabase | Pass — 34 runs, `25 local + 23 in Supabase, merged` (§6b) |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 68 tests, 85 files, G5, G8, G9 |

### 6b. The evidence file, and what twelve runs did to decision 0009

`docs/evidence/014-final-compare.txt` — **34 runs, 25 local + 23 in Supabase,
merged.** The first attempt produced a partial file because the Supabase project
had auto-paused; the header said `25 local, merged` rather than naming a second
source, which is turn 009's fix working exactly as intended — a missing source
is visible on the first line instead of inferable from a row count.

The committed allocation now has **twelve runs** behind it, where decision 0009
rested on five:

| Judge | Then (5 runs) | Now (12 runs) |
|---|---|---|
| barak | justified ×3, not ×2 | justified ×9, not ×2, absent ×1 |
| elon | not ×4, justified ×1 | not ×8, justified ×4 |
| shamgar | not ×5 | not ×12 |

The finding holds and is firmer than it was. The panel divides under flash-lite
judges in essentially every run; shamgar has not moved in twelve; barak leans
justified rather than splitting evenly. 0009 said *"5 runs per condition at
temperature 0.7 — that is a coin the sample cannot call"*, and that caveat can
now be narrowed. **Roy: 0009 is yours, so I have not edited it. It is worth a
dated line saying the sample grew and the conclusion survived.**

Two other things the fuller data shows:

- **G3 is no longer quite the same gap.** 94 of 96 judge opinions cite all five
  facts, but there are now *two* exceptions rather than one — `[4]` and
  `[0,1,3,4]`. The gate still has never fired, because neither cites an index
  that does not exist, but "the judges always fill the array" is no longer
  strictly true and the record should stop implying it.
- **A 43-second run completed.** `08-31 12:49`, 4 of 7 calls, `waited 43.4s` —
  comfortably past the 30-second synchronous limit that shaped turns 012 and
  013. That is the background function earning its decision, observed rather
  than asserted.

### 6a. What this says about the other citations

The nine gates, the eleven decisions and the fourteen turn records are full of
cross-references, and until this turn **none of them was ever checked**. Two were
broken. The rest resolve, but they resolved by luck rather than by anything
verifying them.

The pattern is one already in `CLAUDE.md` under a different name: *when a rule is
stated in two places, add a check that they agree or delete one statement.* A
citation is a rule stated in two places — the claim and its source — and this
project had been writing them for two weeks with nothing joining the halves.

### What I did not verify

- **That 0001 and 0002 say what was actually decided at the time.** They are
  reconstructions. The reasoning in them is drawn from what the code, the
  schema, the database and the turn records enforce, which is strong evidence of
  what was decided but is not the same as a contemporaneous note. Both files say
  so at the foot. **Roy: these are the two records most worth your reading, both
  because they are the most cited and because I wrote them from inference.**
- **That every individual cited run has its own file.** `014-final-compare.txt`
  covers all 34 runs as a table, which is what the turn records' claims rest on.
  The per-run JSON for browser runs still exists only in Supabase — turn 009
  established that and `docs/evidence/README.md` says so. Copying those out
  would need a small extra tool.
- **Anything about the two thirds of the grade that are not this repository.**
  The grading map's own rows for class engagement and the independent project are
  unchanged and mostly OPEN.

## 7. Outcome

**Locked:** every decision this repository cites now exists and is checked
mechanically. The grading map matches the deployed state.

**Open:** decision 0009 could carry a dated line noting the sample grew from 5
runs to 12 and the conclusion survived — Roy's file, Roy's call. G3 still
unproven, though the "judges always fill the array" phrasing needs softening.
The independent project and the engagement third, neither of which this
repository can close.

**Next turn:** the final deploy, then the email.

### Correction issued this turn

**A citation is a claim with a source, and nothing was checking that the source
existed.** The most-cited rule in the project had no record for thirteen turns
and every reference to it looked correct. Where a repository cross-references
itself, a machine should follow the links.
