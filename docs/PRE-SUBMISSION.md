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
- [ ] **`npm run hooks` has been run in this clone.** Git does not run hooks
      from a fetched repository, so `.githooks/pre-commit` is tracked but not
      active until someone points `core.hooksPath` at it. A hook nobody
      installed is decoration (Module 12)
- [ ] The hook has actually refused something. If it never has, it is untested
      infrastructure — see *verification theatre*, Module 13
- [ ] Every gate has failed at least once, visibly, somewhere in the history
- [ ] Any gate that has never fired on real input is recorded as **unproven**,
      not as passing

## Secrets and hygiene

- [ ] `.env` is gitignored and has never been committed
- [ ] No key in any tracked file — `npm run check` runs G8, and since turn 026
      the pre-commit hook runs it without being asked. Module 17: *"Enforce
      this with a scanning hook, not with care"*
- [ ] `package-lock.json` is committed
- [ ] `node_modules/` and `logs/` are not

## Deploy before you send the email

The instructor sees this project when the email arrives, so the site has to be
current **at that moment** — not merely to have been current at some point.

- [ ] Re-enable Netlify builds and run one final deploy after the last commit
- [ ] Confirm the deployed site matches `main` — check something only the newest
      commit has, so "it loads" is not mistaken for "it is current"
- [ ] Re-check definition of done items 1 and 3 at the public address, after
      that build. Item 1 was narrowed on 10.09.2026 — convene a repository case
      and read the opinions; there is no submission form to check
- [ ] Then send the email

Left undone, this fails quietly and in the worst way: the repository reads as
finished, the site loads, and the two are different — which is indistinguishable
from a claim that was never true.

## The database pauses itself — check this before any demo

**Supabase free-plan projects pause after seven days of low activity.** It
happened on 31.08.2026, mid-session: `npm run compare` reported
`Supabase read failed: fetch failed` and fell back to local files only.

This matters more than it looks. If the instructor opens the site days after
submission, a paused database means:

- **Past proceedings is empty** — definition of done item 3 fails at the moment
  it is being assessed;
- a new deliberation runs, costs money, and cannot be stored.

The app degrades honestly rather than lying about it — the archive says it could
not be read, and `compare`'s header names the sources it actually had — but an
honest failure is still a failure to a grader who only has one look.

- [ ] Wake the Supabase project from the dashboard **the morning of any demo or
      deadline**, and again if more than a few days have passed
- [ ] Open the live site in a **private window** and confirm Past proceedings
      lists runs. Logged-in is not the test; a stranger is
- [ ] Convene one deliberation there, so the visit itself counts as activity

## Final state

- [ ] Working tree clean, everything committed
- [ ] Everything pushed — check `git status` says up to date with origin
- [ ] No stranded branch, no half-finished work in a stash
- [ ] The build runs from a fresh clone: `npm install && npm test`
- [ ] Instructor added as a collaborator on both repositories

## From lessons 7-9, and still open

These arrived with Modules 12-17 and are named in the slides rather than
inferred. Recorded here honestly rather than quietly dropped.

- [ ] **The Merge-Readiness Pack.** Five criteria, each shown by evidence and
      never by claim: functional completeness, sound verification, engineering
      hygiene, rationale, auditability (L7 s42, L9 s11-12). Not built. L9 s46
      suggests it lives as a skill plus a reviewer's instructions
- [ ] **Whoever writes the tests was not shown the code.** L7 s35: *"One agent
      writes the code, another writes tests. Show the second the specification,
      never the code."* Not done — the same agent wrote both throughout, which
      is the failure L7 s33 describes. Cannot be retrofitted across 90 tests;
      **can** be done visibly for one change and recorded
- [ ] **`/code-review` and `/security-review` run, and their output filed as
      evidence** (L9 s24, s45). Close to free and directly asked for
- [ ] **A coordination design document** naming each agent's role, input,
      output and boundary, the handoffs, what happens when one fails, and what
      the arrangement costs and buys (L8 s38). Partly in `docs/01-spec.md`;
      not written as the artefact Module 15 describes

## The other two thirds

The running project is one third of the grade. Do not let a tidy repository
disguise the state of the rest.

- [ ] The independent project has **commit history across at least three full
      turns of the spiral**
- [ ] Its framing document is committed: problem statement, testable definition
      of done, out-of-scope list
- [ ] The engagement emails were actually sent — what you read, what you built,
      and papers or tools with a line on why each matters
