# Grading map — every requirement, and the evidence for it

Built from Gorsky's written grading rules. One row per gradeable requirement,
naming the artifact that proves it. Status is honest, not aspirational.

The rules are explicit that only what is in the repository at the deadline
counts, and that a repository re-created after the fact with its history lost
does not count for anyone. So this file is a working checklist, not a
retrospective one — the gaps below have to be closed forward, by doing the work
and committing it, not by reconstructing it later.

Legend: **DONE** · **STARTED** · **OPEN** · **BLOCKED**

---

## Third 1 — Class engagement (33%)

| Requirement | Evidence | Status |
|---|---|---|
| Attendance recorded | Sheet, opens 5 min after the scheduled time, closes at 35 min | OPEN — arrive inside that window |
| Tell him in advance about a missed class | Email | OPEN — ongoing |
| Read the whole textbook | Told to him directly | OPEN |
| Perform all the exercises | Told to him directly; committed where they produce artifacts | OPEN |
| Build the running project | This repository | STARTED |
| **Inform him you have done the above** | Email — the rules say the full path requires finding the occasions to tell him | OPEN |
| Ask and answer substantial questions in class | In the room | OPEN — ongoing |
| Demonstrate your workflow live when asked | Be able to run a turn end to end on demand | OPEN |
| Send him papers, tools, arguments — with a line on why it matters | Email, periodically | OPEN |

The rules state plainly that reading the book, doing every exercise, building
the project, and telling him earns 100 on this third *whether or not every
attendance sheet was filled*. This is the third with the clearest path to full
marks and it is currently the least started. The one-line "why it matters" is
the part that is actually being graded on the sends — not the link.

## Third 2 — The running project (33%)

The specification here is fixed and shared across the class. These are not
choices.

| Requirement | Evidence | Status |
|---|---|---|
| The panel | Four advocates (`cases/T-001…json`), three judges (`panel/judges.json`); `src/deliberate.js` runs all seven — four advocates concurrently, then three judges concurrently (turn 008 §6b) | DONE — exercised against real models across eleven deliberations |
| **Protocol refuses to combine verdicts** — three reported side by side | `docs/decisions/0002`; `schemas/opinion.schema.json` forbids nine field names and has nowhere to hold a combined result; G5 scans the whole repo including `src/` with per-line pragmas; `src/render.js` shows three peers with no headline; a test greps the result object | DONE |
| **Charge sheet written precisely as a specification, not free text** | `docs/02-charge-sheet-spec.md` (meaning) + `schemas/charge-sheet.schema.json` (enforceable) + `cases/T-001-realm-v-jon-snow.json` (first instance) + G1 in `src/gates.js`, running before any model call | DONE |
| **Seven agent prompts written and versioned** | `prompts/` — stable paths, `version` headers, changelogs; loaded and SHA-256'd at call time, with version and hash on every log row so an opinion traces to the exact text that made it. Advocates at **v1.2**, judges at **v1.1**; every bump is an in-place edit with a dated changelog row, so `git diff` shows the text that changed | DONE — executed against real models, and the versions moved for measured reasons (turns 004, 005) |
| The cases | `T-001` supplied by the instructor 24.08, encoded as a repository fixture, validated by G1; `docs/decisions/0003` | DONE |
| Models reached through OpenRouter | `src/providers/openrouter.js`, exercised for real 31.08: eleven deliberations logged, `require_parameters` added after a routing downgrade was caught by G2, `--json-mode` added after the parameter turned out to be deciding which models could be tested at all. Key read from the environment, never leaves the module, never reaches the browser | DONE |
| **Progression from one model toward several is visible** | `modelMap()` in `src/config.js` still holds the committed allocation, seven entries equal, so the project's own progression remains a diff plus a decision record. **The architecture now supports and displays a mixed panel**: `panel/models.json` allowlist, per-role picker in `web/`, `resolveModelMap()` validating overrides, and `deliberations.model_map` recording all seven role→model pairs (turn 008). The measured case for moving is in turn 004 §6c and turn 005 §6a | STARTED — supported and visible; the committed move itself not yet made |

## Third 3 — Your own project (33%)

Specification is yours. Domain does not affect the grade; neither does polish.

| Requirement | Evidence | Status |
|---|---|---|
| Independent application of your own design and subject | Separate repository | OPEN |
| **Framing document** — problem statement, testable definition of done, out-of-scope list | `docs/00-framing.md` in that repo, framed per Module 6 | OPEN |
| **Commit history across at least three full turns of the spiral** | At least three complete turns, each with intent → spec → context → plan → execution → verification → record | OPEN |
| **Runs in parallel on the same module beats** | Timestamps in both repos advancing together, week by week | OPEN — see the schedule note below |

## The application itself

Not a fixed requirement of the running project — Gorsky's specification names
the panel, the protocol, the charge sheet, the cases, OpenRouter, the prompts
and the model progression, none of which require deployment. It is required by
`docs/00-framing.md` §3, which is ours.

| Requirement | Evidence | Status |
|---|---|---|
| Persistence | `db/schema.sql`, `src/sinks/supabase.js`; runs written to Postgres from both the CLI and the app, and read back by `npm run compare`, which merges database and local files so no run is dropped (turns 006, 009) | DONE |
| HTTP wrapper | `netlify/functions/` — thin by design; every rejection path verified with real `Request` objects (turn 007 §6), and the success path now exercised through a browser | DONE locally |
| Interface | `web/index.html`, no build step (decision 0008): three judge columns in fixed order, a failed judge shown as a failure, per-role model picker | STARTED |
| **DoD 1 — a stranger can submit and read the opinions** | A browser submitted T-001 and read three opinions, 31.08 (turn 009). Two such runs are in the database | **DONE locally** — OPEN at a public address, since nothing is deployed |
| DoD 3 — a case is retrievable by someone who did not submit it | — | OPEN — nothing reads the database back, and RLS has no read policy |
| Deployed at a public address | — | OPEN — no Netlify site exists |

## Graded across both projects

| Requirement | Evidence | Status |
|---|---|---|
| **Kept on schedule** — module beats, checkpoints on time | Commit timestamps | OPEN — behind; see below |
| **Documented as you go, not retrofitted** | Doc commits interleaved with code commits, not clustered at the end | OPEN — starts with your first commit |
| Context files kept **and maintained** across sessions | `CLAUDE.md` edited across every turn, and **pruned twice against Module 11's 200-line limit** (198→178, 194→178). Both prunes found stale statements no one was looking for: two pre-decision-0002 claims that the app shows a headline verdict, and decision 0007 missing from the settled list. The pitfalls section was restructured from one line per incident to six groups by lesson, so it stops growing linearly | DONE — maintained, with the maintenance itself producing findings |
| **Commits made before agent invocations** | Clean tree before each turn, stated in every turn record's header | DONE — held across eight turns |
| Honest atomic commit messages | One change per commit; messages naming the intent | DONE — including messages that record a mistake rather than hide it ("Remove an invented function timeout and report the real HTTP status") |
| **Verification gates that catch real failure modes** | Eight gates specified in `docs/01-spec.md` §4, each with a written answer to "will this actually fire?"; two properties deliberately reported rather than gated, with the reason | **DONE.** Eight gates in `src/gates.js` and `tools/repo-checks.js`; 42 tests, most written from the failing side. **G2 has now fired on live model output** (turn 003 §6a): a prose response caused by a provider routing downgrade, diagnosed, fixed, and confirmed by a clean re-run. G8 fired on a test fixture and was answered by renaming the fixture rather than weakening the scan. G5 was found exempting all of `src/` — the only place the defect could appear — and rewritten to scan everything with visible per-line pragmas. **Honest gaps: G3 has never fired on real output** (28 of 29 judge opinions cite every fact), and the copied-case gate added in turn 005 fires only in tests. Both are recorded as written-and-unproven, not passing |
| Final state left merge-ready | No broken build, no stranded branch, no uncommitted work at the deadline | OPEN |

---

## The schedule problem, stated plainly

The rules grade schedule in its own right: "A build that arrives late, or whose
trail is retrofitted, loses marks even when the final artefact is sound." The
own project is meant to run in parallel with the running project on the same
module beats — framed when the running project was framed, which was Module 6,
Lesson 4, 27 July.

As of 18 August, six lessons have run and there are no commits. That gap cannot
be closed by backdating, because a re-created history is explicitly worth
nothing. It can only be closed by starting now and moving fast enough that the
remaining beats are hit on time.

What that argues for: commit today, even if the first commit is only this
scaffold and an honest message. A short, real history that starts late is worth
more than a long, fabricated one — and it is the only one of the two that the
rules will accept.

## Where the ceiling sits

Everything above, done competently, reaches the defendable range up to 90 — and
that range is the only one a regrade can operate in, because it is the only one
backed by evidence you can point to. The rules are explicit that the bands above
rest on judgement rather than a checklist, and that completing requirements does
not produce them. So this file is a floor, not a target.
