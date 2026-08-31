# Pre-submission checklist

**Read this before the final class, not on the day.** Several items cannot be
fixed late — a re-created history is worth nothing, and a trail assembled at the
end loses marks even when the build is sound.

Working through this list is itself part of leaving the project merge-ready,
which the grading rules name directly.

---

## Evidence — the thing most likely to be forgotten

`logs/` is gitignored, so **nothing in it reaches the repository**. Every run a
turn record cites has to be copied into `docs/evidence/` by hand, per decision
0007.

- [ ] Every run cited by a turn record or a decision has a file in `docs/evidence/`
- [ ] `docs/evidence/README.md` index matches what is actually in the folder
- [ ] Every file in the folder is cited by something. An orphan is a defect
- [ ] The `*.json` files are copied unmodified from `logs/deliberations/`
- [ ] The `*.txt` transcripts still carry their "not a machine-written artifact" header
- [ ] Nothing in `docs/evidence/` was reconstructed after the fact

Why this is first: it is the only item where the work is already done and the
artifact still fails to reach the grader. Everything else on this list is
visible in the repo; this one is invisible until someone looks for it.

## The record

- [ ] A turn record exists in `docs/turns/` for every turn, on the seven-part frame
- [ ] Each was written during its turn, not reconstructed
- [ ] Every turn record has a **"what I did not verify"** section that says something real
- [ ] Every decision that could have gone another way has a file in `docs/decisions/`
- [ ] No decision record is still marked DRAFT
- [ ] `docs/GRADING-MAP.md` status column is honest — no row claiming DONE that isn't

## Context files

- [ ] `CLAUDE.md` under 200 lines (Module 11)
- [ ] `CLAUDE.md` shows a history of edits across the term, not one initial commit
- [ ] Nothing in it contradicts a decision record. Re-read the top; stale
      statements collect there because nobody re-reads the top
- [ ] Every correction issued during the term became a written rule or a
      pitfalls entry

## Specification and prompts

- [ ] `docs/01-spec.md` matches what the code actually does, or the difference
      is recorded as a known gap
- [ ] All seven prompts present, with `version` headers and changelog rows
- [ ] No prompt file named `…-v2.md` — versions bump in place
- [ ] A prompt edited during the term shows the edit in `git diff`, not as a new file

## The running-project requirements

Fixed and shared across the class; these are not choices.

- [ ] Four advocates, three judges
- [ ] The three rulings reported side by side, **never combined** — `npm run check`
- [ ] Charge sheet is a specification, not free text
- [ ] Seven agent prompts, written and versioned
- [ ] Models reached through OpenRouter
- [ ] **Progression from one model toward several is visible in the history**,
      and driven by the logs rather than asserted

## Gates

- [ ] `npm test` passes
- [ ] `npm run check` passes
- [ ] Every gate has failed at least once, visibly, somewhere in the history
- [ ] Any gate that has never fired on real input is recorded as **unproven**,
      not as passing

## Secrets and hygiene

- [ ] `.env` is gitignored and has never been committed
- [ ] No key in any tracked file — `npm run check` runs G8
- [ ] `package-lock.json` is committed
- [ ] `node_modules/` and `logs/` are not

## Final state

- [ ] Working tree clean, everything committed
- [ ] Everything pushed — check `git status` says up to date with origin
- [ ] No stranded branch, no half-finished work in a stash
- [ ] The build runs from a fresh clone: `npm install && npm test`
- [ ] Instructor added as a collaborator on both repositories

## The other two thirds

The running project is one third of the grade. Do not let a tidy repository
disguise the state of the rest.

- [ ] The independent project has **commit history across at least three full
      turns of the spiral**
- [ ] Its framing document is committed: problem statement, testable definition
      of done, out-of-scope list
- [ ] The engagement emails were actually sent — what you read, what you built,
      and papers or tools with a line on why each matters
