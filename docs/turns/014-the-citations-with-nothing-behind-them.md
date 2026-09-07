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
| Suite and repo checks | `npm test`, `npm run check` | Pass — 68 tests, 84 files, G5, G8, G9 |

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
- **That the evidence folder is complete.** Turns 011, 012 and 013 cite live
  runs — the 6-of-7 truncation, the four-provider panel, the background run —
  and none has a file in `docs/evidence/`. Decision 0007 requires one per cited
  run. This is the largest open item and it needs runs that are on Roy's machine
  and in Supabase, not here.
- **Anything about the two thirds of the grade that are not this repository.**
  The grading map's own rows for class engagement and the independent project are
  unchanged and mostly OPEN.

## 7. Outcome

**Locked:** every decision this repository cites now exists and is checked
mechanically. The grading map matches the deployed state.

**Open:** evidence files for turns 011–013. G3, still unproven. The independent
project and the engagement third, neither of which this repository can close.

**Next turn:** the evidence sweep, then submission.

### Correction issued this turn

**A citation is a claim with a source, and nothing was checking that the source
existed.** The most-cited rule in the project had no record for thirteen turns
and every reference to it looked correct. Where a repository cross-references
itself, a machine should follow the links.
