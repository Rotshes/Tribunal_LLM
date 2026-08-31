# 0007 — Which runs become evidence, and which stay in logs

Status: accepted (Roy, 31 August 2026)
Date: 31 August 2026

Drafted by the agent at Roy's request and operated under for turns 007–011
before being accepted; `docs/evidence/` was built to it throughout.

## The decision

`logs/` stays gitignored. A run is copied into `docs/evidence/` **only when a
turn record or a decision cites it**, and the citation names the file.

Two file kinds, and they are not equivalent:

- **`*.json`** — copied unmodified from `logs/deliberations/<id>.json`,
  machine-written at the moment the run completed. The default from turn 004 on.
- **`*.txt`** — verbatim terminal transcripts, for runs that predate
  `src/persist.js`. Contemporaneous but hand-copied, and labelled as such at the
  top of every file.

A run nothing refers to does not go in. Neither does a tidied one.

## Why, and what it was chosen over

**Commit every run.** Rejected. The repository is read as a record; a folder of
generated output nobody refers to makes the parts that matter harder to find,
and the volume grows with every experiment. Evidence that supports no argument
is not evidence.

**Commit nothing; the logs are local.** Rejected, and it is the option this
project had by default until now. It contradicts a convention already in
`CLAUDE.md` — *a case that exists only in the database is not evidence anyone
can open* — and the same reasoning applies with more force to the runs that a
model-choice decision will rest on. An argument citing measurements a reader
cannot open is an assertion.

**Reconstruct the early runs into JSON so the folder is uniform.** Rejected, and
firmly. A hand-assembled file shaped like a captured one is indistinguishable
from a captured one to any later reader, including a grader. The course rules
discard a retrofitted trail; producing one deliberately would be worse than the
gap it hides. The two file kinds stay visibly different.

## The gap this records

Runs before 31 August 2026 have no stored opinions. `src/persist.js` did not
exist: `logs/model-calls.jsonl` recorded what each call cost — model, role,
tokens, cost, latency, prompt hash — but not what it said. The rulings survive
only as terminal transcripts.

That gap is why persistence exists. Turn 004 set out to compare four runs,
found the opinions were nowhere on disk, and stopped to fix it before running
anything further. The sequence is worth more in the record than four uniform
files would have been.

## Consequences

- `docs/evidence/README.md` indexes every file with the run id, its
  configuration, and what cites it. A file with no citation is a defect.
- Copying is unmodified. Not reformatted, not trimmed, not corrected.
- The index is maintained when the turn record is written, not afterwards.

## What would change this

If evidence files come to outnumber the turn records citing them, the rule is
being applied loosely rather than being wrong — tighten the application. If a
run needs to be cited long after the fact and its file was never copied, that
argues for copying at the moment of citation, which is already the rule.
