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
| The panel | Four advocates (`cases/T-001…json`), three judges (`panel/judges.json`) — defined; not yet wired to code | STARTED |
| **Protocol refuses to combine verdicts** — three reported side by side | `docs/decisions/0002`; `schemas/opinion.schema.json` has no field able to hold a combined result and forbids nine by name; gate G5 specified | DONE (decided) / STARTED (designed into the shape) / OPEN (built) |
| **Charge sheet written precisely as a specification, not free text** | `docs/02-charge-sheet-spec.md` (meaning) + `schemas/charge-sheet.schema.json` (enforceable) + `cases/T-001-realm-v-jon-snow.json` (first instance) | DONE (written) / OPEN (validator not yet code) |
| **Seven agent prompts written and versioned** | `prompts/` — four advocates, three judges, stable paths, `version` headers, changelogs; convention and its reasoning in `prompts/README.md` | DONE (v1.0 written) / OPEN (never yet executed against a model) |
| The cases | `T-001` supplied by the instructor 24.08 and encoded as a repository fixture; `docs/decisions/0003` | STARTED |
| Models reached through OpenRouter | Backend calls OpenRouter; key never in the browser | OPEN |
| **Progression from one model toward several is visible** | Per-role `MODEL_MAP` specified in `docs/01-spec.md` §3 with all seven entries equal at the start, so the progression is a config diff plus a decision record citing the logs | STARTED (shape fixed) / OPEN (not yet carried) |

## Third 3 — Your own project (33%)

Specification is yours. Domain does not affect the grade; neither does polish.

| Requirement | Evidence | Status |
|---|---|---|
| Independent application of your own design and subject | Separate repository | OPEN |
| **Framing document** — problem statement, testable definition of done, out-of-scope list | `docs/00-framing.md` in that repo, framed per Module 6 | OPEN |
| **Commit history across at least three full turns of the spiral** | At least three complete turns, each with intent → spec → context → plan → execution → verification → record | OPEN |
| **Runs in parallel on the same module beats** | Timestamps in both repos advancing together, week by week | OPEN — see the schedule note below |

## Graded across both projects

| Requirement | Evidence | Status |
|---|---|---|
| **Kept on schedule** — module beats, checkpoints on time | Commit timestamps | OPEN — behind; see below |
| **Documented as you go, not retrofitted** | Doc commits interleaved with code commits, not clustered at the end | OPEN — starts with your first commit |
| Context files kept **and maintained** across sessions | `CLAUDE.md` with a history of edits, not one initial commit — second edit 24.08 adding three standing rules and the first two entries in the pitfalls list | STARTED |
| **Commits made before agent invocations** | Clean tree before each turn; the diff attributable to that turn | OPEN — habit starts now |
| Honest atomic commit messages | One change per commit; messages that do not overstate | OPEN |
| **Verification gates that catch real failure modes** | Eight gates specified in `docs/01-spec.md` §4, each with a written answer to "will this actually fire?"; two properties deliberately reported rather than gated, with the reason | STARTED — the two schemas were exercised with 14 sample objects (turn 001 §6a) and rejected all 10 that should fail, but the validator is not yet in the repo and no gate has fired on real model output, which is the part that counts |
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
