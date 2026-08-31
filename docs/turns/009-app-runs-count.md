# Turn 009 — App runs count

Date: 31 August 2026
Branch / commit: `main`, clean at the start.

## 1. Intent

The app completed its first deliberation this turn — **definition of done item 1
is met**, and turn 007's open question is closed.

Then `npm run compare` showed fourteen runs and none of them was it.

The Netlify function has no local disk, so it wrote only to Supabase; `compare`
read only local files. Every run through the app fell into the gap between them
— invisible to the tool the model-progression argument depends on. Turn 006 said
the database was the record. For the runs that matter most, it was not.

## 2. Specification

- The two timings are stored as **separate columns**, and named so they cannot
  be confused again.
- `compare` reads the database.
- Runs made before Supabase existed must not disappear.

## 3. Context supplied

`src/sinks/supabase.js`, `tools/compare.js`, `db/schema.sql`, and the compare
output showing the browser run missing.

## 4. Plan

Columns → sink writes them → `readDeliberations()` → compare prefers the
database. The last step was wrong; see §6a.

## 5. Execution

`db/schema.sql` — `wall_ms`, `model_time_ms`, `calls_attempted`,
`calls_succeeded`, `tokens_in`, `tokens_out`, each with `add column if not
exists` so an existing database upgrades in place.
`src/sinks/supabase.js` — writes them, flattened out of `usage`; new
`readDeliberations()` rebuilding the shape compare expects.
`tools/compare.js` — merges both sources.
`.gitattributes` — see §6b.
`tests/gates.test.js` — 42 → 44.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| The sink writes both timings as distinct values | Test against a fake fetch | Pass |
| Reading rebuilds the shape compare expects | Test with a fake PostgREST response | Pass |
| Both sources merge, deduplicated | Live: 14 local + 5 remote = 16 | Pass |
| A run in both keeps what only the file has | Merge exercised directly: database `wall_ms` wins, local token counts survive the database's nulls, failure lists preserved | Pass |
| Runs through the app appear | Live | Pass — 03:44 and 11:00 exist only in Supabase |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 44 tests |

### 6a. Preferring the database dropped nine runs

The first version made Supabase the source when configured. It worked, and
`compare` immediately showed **five runs instead of fourteen** — because
Supabase writing only began at turn 006 and nothing backfills.

Among the nine lost: the entire `--json-mode off` group, which is what turn
004's 29%-failure finding rests on, and every pre-005 advocate run, which is
what shows the one-sided panels turn 005 fixed.

The tool did not error. It printed a clean table of a subset, and a subset still
reads like an answer. That is the same shape as two earlier defects in this same
file — the missing `calls` column that hid a 25% failure rate for four runs, and
the missing failure reasons that left three distinct causes looking like one.

Three times now, this tool has been confidently wrong by omission. The lesson is
narrower than "test more": **a tool that summarises must say what it is
summarising over.** The header now reads `14 local + 5 in Supabase, merged`, so
a missing source is visible on the first line rather than inferable from a row
count nobody checks.

Neither source is complete. Pre-006 runs exist only as files; browser runs exist
only in the database. The record is the union.

### 6b. A line-ending problem that would have broken traceability

`git add` warned that LF would become CRLF on checkout. Not cosmetic:
`src/prompts.js` hashes each prompt file **as it sits on disk**, and that
`prompt_sha256` goes on every call row so an opinion traces to the exact text
that produced it.

Git's Windows default would make the same prompt hash differently on Windows
than on Linux. A hash recorded here would not reproduce for anyone cloning the
repository, including the instructor — and the traceability claim would be
quietly false while continuing to look rigorous.

`.gitattributes` now forces `eol=lf`, so the bytes hashed are the same
everywhere.

### What I did not verify

- **That existing hashes are correct.** Every `prompt_sha256` recorded before
  `.gitattributes` was computed from a CRLF working copy. Those rows are
  internally consistent but will not match a fresh LF checkout. Not repaired:
  rewriting stored hashes to match a later convention is exactly the kind of
  tidying that makes a record untrustworthy. The discontinuity is real and is
  recorded here instead.
- **The 35-second browser run.** It predates the timing columns, so its
  `wall_ms` is null and the question of whether the function ran sequentially is
  still open. The next browser run answers it.
- **The Supabase read path against a real database read.** Exercised only
  against a fake fetch; the live path has been written to but never read from in
  anger.

## 7. Outcome

**Locked:** DoD item 1 is met. The record is the union of both sources and says
which sources it drew on. Runs through the app carry their own timing.

**Open:** the browser run's `wall_ms`. G3 still unproven — 43 of 44 judge
opinions cite every fact. RLS still has no read policy, so DoD item 3 is not met.
Deployment.

**Next turn:** the model comparison. Five runs on a second model against the
thirteen `json:object` runs already recorded, then the allocation change with
the logs behind it. Both sources now feed the comparison, so the runs can come
from the terminal or the browser.

### Correction issued this turn

**A tool that summarises must name what it summarised over.** Third omission
defect in `tools/compare.js`. The fix is not more tests; it is that the header
line now states its sources, so an absent one is visible rather than
inferable.
