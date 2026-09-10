# Turn 026 — The gate that fires without being asked

Date: 10 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Lessons 7 and 9 name a pre-commit hook four times, and this project did not have
one. Module 12:

> A hook runs automatically whenever a commit is attempted. It refuses that
> commit when the check fails… It turns away bad changes with nobody present.

Module 17, on secrets, is blunter: *"Enforce this with a scanning hook, not with
care."* And: *"Run these before the commit, never after."*

The project has had G5, G8 and G9 since turn 002 and has run them by typing
`npm run check`. Module 13 says what that is worth at the wrong hour: *"The day
you skip it is the day it guarded. Make the tools refuse the merge mechanically.
Willpower at a late hour is not a control."*

## 2. Specification

- A commit that fails the repository checks or the tests is refused.
- No way around it from inside the hook.
- Installed by an explicit command, since git does not run hooks from a fetched
  repository.
- The hook runs the **real** checks, not a copy of them.

## 3. Context supplied

Lesson 7 (Module 12, slides 17–20), lesson 9 (Module 17, slides 37, 45–46),
`tools/repo-checks.js`, `package.json`.

## 4. Plan

`.githooks/pre-commit` → `npm run hooks` to install → a test → break it.

## 5. Execution

The hook runs `npm run check` then `npm test`, under `set -e`, and exits 1 on
either. It calls the npm scripts rather than restating what they do, so it
cannot drift from the checks it claims to run — the defect this project has paid
for more than any other.

`.githooks/` is tracked and `npm run hooks` points `core.hooksPath` at it. That
second step is not ceremony: git deliberately does not run hooks from a cloned
repository, so a hook nobody installs is decoration, and the checklist now says
so.

**No escape hatch.** No `SKIP=1`, no `|| true`, no environment variable that
waves it through. A hook that can be told to skip itself is a hook that gets
told to, on the night it matters. The test asserts the absence.

## 6. Verification

**90 tests pass. `npm run check` clean over 119 files.**

| Probe | Result |
|---|---|
| write a file containing `sk-or-v1-…` and run the hook | **refused, exit 1**, G8 named the file and line |
| add `[ -n "$SKIP_CHECKS" ] && exit 0` to the hook | test fails |

The first is the one that matters. Module 13 warns about gates that catch
nothing — *"A trusted gate that catches nothing beats no gate"* — so this one was
made to catch something before being trusted: a fake key in `src/leak-probe.js`,
refused, then deleted.

### Not verified

- **The hook has never fired on a real commit**, only when invoked directly with
  `sh .githooks/pre-commit`. Git's own invocation path — staged files, a
  different working directory, Windows line endings on a `#!/bin/sh` script under
  Git for Windows — is untested. The first real commit after `npm run hooks` is
  the test, and if it behaves oddly the hook is the first suspect.
- It checks the working tree, not the staged index. A commit of *part* of a
  dirty tree is validated against the whole of it. That is the ordinary
  behaviour of a simple hook and it errs toward refusing, not toward passing.
- It adds about four seconds to every commit. Whether that survives contact with
  a long session is a question about people, not code.

## 6b. Postscript — the hook's first real commit, and what it found

Roy installed it and committed. The hook ran, and refused:

```
pre-commit: repository checks (G5 no combined result, G8 secrets, G9 citations)
checked 1201 files
G8: .env is present in the working tree — confirm it is gitignored
```

**Two defects, both older than the hook, both invisible until it ran.**

**1. G8 failed on a healthy machine.** It treated a `.env` *existing* as a
problem and exited 1. That is the correct state of every machine that can
actually run this app — the key has to be somewhere — so `npm run check` had
been failing on Roy's checkout the whole time, and the hook turned that into
"every commit is refused".

A gate that fires on the normal case is worse than no gate. It teaches the
person to reach for `--no-verify`, and Module 13 says where that ends: *"The day
you skip it is the day it guarded."* The defect was never the file existing; it
is the file being **committed**. G8 now fails only when git is actually tracking
it.

This had been latent since turn 002 and never showed, because the container that
ran `npm run check` has no `.env` in it. **The check passed everywhere it was
run and failed everywhere it mattered.**

**2. 1201 files against 120.** The scan walked the filesystem behind a
hand-maintained `SKIP_DIRS` list, so a working machine's build caches and
tool droppings were being read as if they were project source. Maintaining that
list means guessing every directory a future tool will create, which is
unwinnable.

It now scans `git ls-files` — the exact set these gates are about, and one that
includes files staged but not yet committed, which is precisely what a
pre-commit hook must judge. The filesystem walk survives as a fallback where git
is unavailable, because a check that refuses to run is worse than one running on
a wider set.

**And a third, found by the fix.** The first version of the new test wrote a
realistic `sk-or-v1-…` into the scratch repository's `.env` — so G8 flagged
`tests/gates.test.js` itself. Correct, and the test never needed it: G8 decides
the tracked-`.env` case from the filename, so the content is now a placeholder.
A test for a secret scan that plants a secret to be scanned is a trap the scan
is right to spring.

**A fourth, from making the hook explain itself.** Its first refusal on Roy's
machine printed nothing but *"TESTS FAILED… run npm test to see which"* — the
suite passed in the container and failed on his, and the gate would not say
what. A gate that refuses without saying why is one you argue with rather than
fix. It now prints the failing test names.

Writing that produced two more findings in a row, both from the hook's own
guard. Printing them needed `grep … || true`, and `|| true` is on the list of
escape hatches the guard forbids — correctly, so `sed` replaced it. Then the
comment *explaining* why `|| true` was avoided failed the same test, because it
scanned the whole file rather than the code. **The guard fired on an explanation
of itself.** Comments are stripped now: the defect is an escape that runs, not a
mention of one — the same lesson as the four false positives already in
`CLAUDE.md`, arrived at for the fifth time.

**What this says about the hook.** It was written to catch bad changes and its
first act was to catch two faults in the checks themselves — one of which meant
the project's secret scan had never once run successfully on the machine holding
the secret. That is the argument for mechanical gates, made by the gate.

## 7. Outcome

Done: `.githooks/pre-commit`, `npm run hooks`, a test with both probes,
`tools/repo-checks.js` fixed on both counts with two tests of its own — one of
them a real scratch repository with a tracked `.env` — and
`docs/PRE-SUBMISSION.md` updated — the hook, and a new section listing what
lessons 7–9 ask for that this project still has not done.

Open, and now written down rather than carried: the Merge-Readiness Pack; tests
written by someone who was not shown the code; `/code-review` and
`/security-review` filed as evidence; a coordination design document.
