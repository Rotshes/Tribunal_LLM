# Turn 013 — Stop fitting

Date: 31 August 2026
Branch / commit: `main`. Site live at `subtle-axolotl-3f3681.netlify.app`.

## 1. Intent

Turn 012 ended with the app working and the panel wrong.

The final budget fit seven model calls inside the measured 30-second limit, and
the deployed run came back **6 of 7**, with the Barak model's column reading:

> no answer within 7s (google/gemini-3.5-flash-lite) — the call was cut off, not
> refused

Everything about that is functioning as designed. The deadline shrank, the
advocates took 14 of the 21 available seconds, Barak got what was left, the
failure was reported as a failure beside two real rulings, and the page said
1 of 7 calls failed.

It is also the platform sitting in a judge's seat. Roy's question — *can't we
have bigger time limits, or none, on waiting for a model* — is the right one,
and the answer is that the synchronous limit cannot be raised but the run does
not have to be synchronous.

## 2. Specification

- No time budget shaping the panel. A judge fails because a model failed, not
  because a platform stopped waiting.
- The browser still sees its result without being told to go and look for it.
- Whatever this costs must be written down, not discovered later.

## 3. Context supplied

Turn 012's record, the deployed 6-of-7 run, the Netlify function log line
showing `Duration: 30000 ms`, and Netlify's background-functions documentation
(fetched, and this time cross-read against the log).

## 4. Plan

`background: true` on the function → the browser mints the id → the page polls
the archive endpoint from turn 011 → decision record → this record.

## 5. Execution

`src/deliberate.js` — accepts `deliberationId`. A background invocation cannot
report the id it chose, so the caller supplies one. It is untrusted (it becomes
a primary key) and is replaced unless it matches the uuid shape.

`netlify/functions/deliberate.js` — `config.background = true`. The whole time
budget is deleted: `PLATFORM_LIMIT_MS`, `RESERVED_MS`, `MODEL_BUDGET_MS`,
`deadlineAt`. A 120-second per-call timeout remains.

`web/index.html` — `run()` no longer reads a response. It mints a uuid, posts
it, expects 202, and calls `awaitResult()`, which polls `GET /api/runs?id=`
every two seconds for up to four minutes. A 404 while polling is the ordinary
case, not an error.

`netlify.toml` — the timing comment rewritten around the design, keeping the
history: the invented `timeout = 26`, the documented 60 versus the measured 30,
and the three budgets that failed.

`docs/decisions/0011` — the decision and, at more length, what it costs.

`tests/gates.test.js` — 60 → 62, including one deletion.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| A supplied id is used | Test | Pass |
| A malformed id is replaced, never used | Test with five bad values including SQL | Pass |
| The function is a background function | Test greps for `background: true` | Pass |
| No time budget remains | Test asserts `deadlineAt` and `PLATFORM_LIMIT_MS` are gone from the function | Pass |
| The page polls rather than reading a body | Test greps for 202 handling, `awaitResult`, and the archive URL | Pass |
| Polling is bounded | Test asserts `POLL_GIVE_UP_MS` exists | Pass |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 62 tests, 79 files |

### 6a. A test was deleted, and that is the honest move

`the deployed budget fits inside the platform limit` asserted that seven calls
fit in thirty seconds. They do not have to any more.

It could have been adjusted to assert something about the new design. It was
deleted instead, with a comment in its place saying why. A test that guards an
abandoned constraint is worse than no test: it passes, so nobody re-reads it,
and it keeps the constraint alive in the head of whoever does.

The deadline *mechanism* is kept and still tested. It is how a hung call is
stopped, which is a real bug at fifteen minutes as much as at thirty seconds.

### 6b. Going background takes away the app's voice

Turn 012's last-resort handler exists so the function always answers for itself
rather than letting the platform say "an unknown error has occurred". A
background function answers **202 before any of that runs**. The handler is
still there and its response reaches nobody.

So this turn removed a class of failure and degraded the reporting of another,
in the same change. Both are true and the record would be dishonest with either
one alone.

What is left: failures are printed to the function log, and the visitor sees the
poll give up after four minutes with a message that says the run may still be
going, may have failed, and where to look. It says both possibilities because
the page genuinely cannot distinguish them — which is the point at which a
message should stop guessing.

The four-minute poll against a fifteen-minute run is a real gap, not a rounding
error: a slow panel can complete into an archive nobody is watching. The message
tells the visitor to reload and check Past proceedings, and the result is
genuinely there. It is a worse experience than a synchronous run and a better
one than a truncated panel.

### What I did not verify

- **Any of it in production.** Every criterion above is a test or a grep. The
  previous turn shipped four times and was wrong three times, and the pattern
  was always the same: passing tests, failing deployment. Nothing here is
  settled until a background run completes on the live site.
- **That the 202 path works at all on Netlify.** `background: true` is read from
  the documentation. Whether this site honours it, and whether the function is
  still reachable at `/api/deliberate`, is untested outside that page.
- **The polling behaviour under a real run.** `awaitResult` has never run
  against a live archive; the 404-while-writing case in particular is reasoned,
  not observed.
- **Whether four minutes is the right give-up.** Chosen to be much longer than
  a normal run and much shorter than fifteen minutes. Not derived.

## 7. Outcome

**Locked:** the deliberation is asynchronous, and no constant in this repository
decides how many judges sit.

**Open:** everything in §6's "what I did not verify" — this turn is verified
only against tests, and the last one taught that this is not enough. G3, still.

**Next turn:** run it on the live site. Defaults first, then the four-provider
mixed panel that has never worked.

### Correction issued this turn

**When the fourth attempt at a constant is due, the constant is not the
problem.** Three budgets failed and the fourth "worked" by cutting a judge off.
Each iteration made the number better and none questioned whether the run
should be racing a clock at all. The signal to look for is a fix that keeps
being nearly right.
