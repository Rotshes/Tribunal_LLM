# Turn 028 — A test that passed by not running

Date: 10 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Turn 027's commit was refused by the pre-commit hook. The hook — improved
minutes earlier to say *why* — named the test:

```
✖ the build fails on an unresolved import
  AssertionError: The input did not match /NoSuchFile|resolve/i.
  Input: 'undefinedundefined'
```

This turn is what that sentence was hiding.

## 2. Specification

- The suite passes on Windows as well as in the container.
- The test proves what it claims: that **the build** rejects an unresolved
  import, not merely that something exited non-zero.

## 3. Context supplied

The hook's output, `tests/gates.test.js`, decision 0012.

## 4. Plan

Fix the spawn → ask what else the failure was covering → probe both.

## 5. Execution

### Three faults, each one hiding the next

**1. `execFileSync('npm', …)` cannot spawn on Windows**, where npm is `npm.cmd`.
It threw `ENOENT` — an error carrying no stdout and no stderr — which is why the
assertion compared the string `'undefinedundefined'`. Now it runs vite through
`process.execPath` directly, needing no shell and behaving the same everywhere.

**2. That fault was hiding behind the shape of the test.** It asked only
*"did the build fail?"*, and a build that cannot start also fails. Had the
message assertion been any looser, **this would have passed on Windows while
proving nothing at all** — a green test standing behind half of decision 0012.
The test now separates *the build ran and rejected the import* from *the build
never ran*, by requiring `err.status` to be a number rather than a spawn error.

**3. And the message assertion was already too loose — this was live.** The
pattern was `/NoSuchFile|resolve/i`. Pointing the test at a build tool that does
not exist produces node's own loader error, which contains `_resolveFilename` —
and that matches `resolve`. The probe passed. So the test could be satisfied by
node failing to find *the build tool*, with the deliberately broken import never
compiled at all.

Now it requires `NoSuchFile`: the build must name **the import this test broke**,
which is the only output that demonstrates the thing decision 0012 claims.

That is Module 13's verification theatre, in this repository, guarding a decision
record: *"A trusted gate that catches nothing beats no gate."*

### And the reason nobody saw it

The container that runs this suite is Linux, where `execFileSync('npm', …)`
works. Roy's machine is Windows. **The suite had never been run there** until the
pre-commit hook ran it as a matter of course. Same shape as turn 026's G8, which
had been failing on his machine and passing in mine since turn 002.

Two gates in two turns, both broken only on the machine that matters, both found
by the same mechanical hook rather than by anyone looking.

## 6. Verification

**89 tests pass; the hook passes.**

| Probe | Result |
|---|---|
| point the test at a build tool that does not exist | **fails** — *"the build never ran, so this proves nothing"* |
| same probe, against the old `/NoSuchFile|resolve/i` | **passed** — the fault this turn exists for |

The test also now asserts that `web/src/App.jsx` is byte-identical to its backup
when it finishes. It mutates a source file to run, and a killed process would
leave a broken App.jsx behind — the next thing to notice would be a failed
deploy.

### Not verified

- **The fix has not been run on Windows.** It removes the npm spawn, which was
  the platform-specific part, but the machine that found this has not confirmed
  the fix. Roy's next commit is the test.
- Whether any other test in this suite is platform-dependent in the same way. I
  looked at this one because the hook named it; nothing has audited the rest.

## 7. Outcome

Done: the build test spawns portably, distinguishes a build that ran from one
that did not, and requires the build to name the import it was given.

The hook has now found three defects in three turns, all of them in the checks
themselves — G8 failing on a healthy machine, this test passing without running,
and its own silence about why it refused. None was found by reading.
