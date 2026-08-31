# Turn 011 — The archive

Date: 31 August 2026
Branch / commit: `main`, clean at the start.

## 1. Intent

Definition of done item 3: *every case submitted is retrievable afterwards by
someone who did not submit it.*

It had been open since the framing document was written, and the grading map's
line for it was one dash. Everything the project had built made runs
**recordable** — the call log in turn 002, `src/persist.js` in turn 004, Supabase
in turn 006, both sources merged in turn 009 — and none of it made a run
**readable** by anyone who was not holding the terminal or logged into the
database dashboard. That is a different claim, and item 3 is the second one.

## 2. Specification

- A list of every stored deliberation, and any one of them openable in full.
- A retrieved run shows **all three rulings**, in the fixed order, with a failed
  judge occupying its column as a failure. The archive gets the same guarantee a
  live run gets, not a weaker one.
- No summary of the three anywhere in the list — no majority, no count, no
  "differ" flag. (0002)
- No Supabase key of any kind reaches the browser.
- An unreachable archive says so. It does not render as an empty one.

## 3. Context supplied

`src/sinks/supabase.js`, `db/schema.sql`, `netlify/functions/case.js` as the
shape for a read endpoint, `web/index.html`, and `docs/00-framing.md` §3.

## 4. Plan

Two sink functions → one endpoint serving both → a section in the page that
reuses the existing renderers → decision record → this record.

## 5. Execution

`src/sinks/supabase.js`
- `readDeliberationIndex()` — two requests for the whole list, regardless of how
  many runs there are. Not `readDeliberations()` with the bodies discarded: that
  pulls every opinion of every run to draw a list of one-liners and gets slower
  with each deliberation the project holds.
- `readDeliberation(id)` — one run in the shape `src/persist.js` writes, so the
  page has one renderer and not two.

`netlify/functions/runs.js` — `GET /api/runs`, `?id=` for one. 405 for anything
but GET, 400 for an id that is not one, 404 for a run that does not exist, 503
when the archive is not configured, 502 when the database is unreachable.

`web/index.html` — a "Past proceedings" section; each row shows the three
rulings as three. Opening one calls the same `renderAdvocates()` and
`renderRulings()` a live run uses. A completed run refreshes the list.

`db/schema.sql` — the access comment updated; see §6b.

`docs/decisions/0010` — reads go through the backend, RLS keeps no policies.

`tests/gates.test.js` — 48 → 54.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| The list carries three rulings per run | Test against a fake PostgREST | Pass |
| Nothing in the list is a summary of the three | Test greps the endpoint payload for `verdict`, `majority`, `consensus`, `score`, `differ` | Pass |
| A retrieved incomplete run shows a failure, not two rulings | Test: a judge with no opinion row and a failed call row | Pass — rebuilt as `judge_failures` |
| A missing run reads as missing | Test | Pass — `null`, and the endpoint answers 404 |
| An id that is not one never reaches the database | Test asserts zero requests were made | Pass |
| An unconfigured archive is distinguishable from an empty one | Test against the handler with a real `Request` | Pass — 503 with a message, not `[]` |
| Method restriction | Test | Pass — 405 on POST |
| No Supabase key in the browser | `web/` imports nothing from `src/`; the key is read in the function | Pass by construction |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 54 tests, 78 files, G5 and G8 clean |
| The endpoint works against the real database | `netlify dev`, browser | Pass — 16 runs listed, one opened in full (§6c) |

### 6a. The failure that would have been invisible

A judge that fails produces **no row in `opinions`**. The schema is right to work
that way — there is no opinion to store — but it means the obvious read returns
two rulings for that run, and two rulings rendered in a three-column layout look
exactly like a panel where one judge happened not to be shown.

This is the failure mode the project has a written rule against: *failure is
shown as failure, never as a ruling, never defaulted to acquittal.* It would have
been worse in the archive than live, because a live run has a status line and a
person who just watched it happen. A retrieved one has neither.

`readDeliberation()` therefore fetches `model_calls` for the run and rebuilds the
failures from the rows where `succeeded` is false. It is a second request for
something that could have been left out, and leaving it out is the defect.

Worth naming plainly: **the read path had to reconstruct information the write
path already had.** The failure reasons were in the run document
`src/persist.js` wrote; they were dropped on the way into a schema with no column
for them. That is not wrong — a failure is a property of a call, and it is stored
on the call — but it is the kind of asymmetry that produces exactly this class of
bug, and I only looked for it because the rule about failures is written down.

### 6b. A comment that would have become a lie

`db/schema.sql` said the read-only public view "gets its own explicit policies"
when it is built. It has now been built and it deliberately has none.

Left alone, that comment would have sat in a file a reader trusts, describing a
plan the project consciously abandoned, with nothing marking it as stale. This is
the third time the standing rule — *when a rule is stated in two places, add a
check that they agree or delete one statement* — has caught something, and the
first time it caught a statement about the future rather than the present.

Updated to state what is true and to name 0010, so that adding a policy later
reads as reopening a decision rather than as filling a gap.

### 6c. Exercised against the real database

Run under `netlify dev`, 31.08. The archive listed **sixteen runs**, newest
first, each with its three rulings; opening one rendered the arguments and the
three opinions through the live renderers. Both `/api/runs` paths therefore work
against real PostgREST, which closes the gap turn 009 left open about
`readDeliberations()` and never closed.

The list also made a boundary visible that no test would have: **it holds
sixteen runs, not twenty-six.** Everything before turn 006 exists only as a local
file, and the archive reads the database. That is correct — a run nobody but the
person at the terminal ever had is not retrievable by a stranger, which is what
item 3 asks about — but it means the repository's record and the app's archive
are different sets, and `tools/compare.js` is the only thing that sees both. Not
a defect; worth writing down before someone reads the archive as complete.

### What I did not verify

- **A failed judge's column, in a browser.** The rebuild is tested against a
  fake database, but every run in the archive is 7 of 7. The three partial runs
  the project has all predate Supabase, so they are not in the archive and the
  path cannot be exercised there without deliberately breaking a run. This is
  the same class of gap as G3: written, tested from the failing side, never
  fired on real data.
- **Behaviour at volume.** 16 runs, `limit=50`. What a hundred runs look like on
  the page is not designed for, and there is no pagination.
- **That the archive is genuinely readable by a stranger.** It will be when the
  site is public. Until it is deployed, item 3 is met on a machine, which is the
  same partial state item 1 has been in since turn 009.

## 7. Outcome

**Locked:** DoD item 3 is met locally. Reads are served by the backend with RLS
closed (0010). Decision 0007 accepted after being operated under for five turns.
The grading map's model-progression row is DONE, and its DoD 3 row names an
artifact instead of a dash.

**Open:** deployment, which is now the only thing between this repository and
every remaining item. G3 still unproven; the failed-judge column in the archive
likewise written and untested on real data.

**Next turn:** deploy, then verify items 1 and 3 at the public address rather
than on a laptop.

### Correction issued this turn

**When a schema comment describes a future intention, it has to be revisited
when that future arrives.** A stale plan in a trusted file is worse than no
comment, because a reader has no way to tell which one they are reading.
