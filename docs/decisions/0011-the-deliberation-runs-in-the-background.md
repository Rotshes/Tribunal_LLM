# 0011 — The deliberation runs in the background

Status: accepted (Roy, 31 August 2026)
Date: 31 August 2026
Supersedes the timing assumption in turn 012, not its findings.

## The decision

`netlify/functions/deliberate.js` sets `background: true`. It answers **202 with
an empty body** and then runs for as long as it needs, up to fifteen minutes.
The browser mints the `deliberation_id`, sends it, and polls
`GET /api/runs?id=` — the archive endpoint built in turn 011 — until the run
appears.

There is no time budget in the function any more. A 120-second per-call timeout
remains, because a call that hangs forever is still a bug.

## Why, and what it was chosen over

The synchronous limit on this site is **30 seconds, measured from its own
function log** (the documentation says 60; see turn 012 §6d). Seven calls on the
committed allocation take about 21 seconds of model time. Turn 012's final
budget fit them inside 30 — by cutting the Barak model off after **7 seconds**
so that the rest of the panel could finish.

That is the argument. A tribunal that drops its third opinion because a platform
would not wait another four seconds is not reporting a disagreement, it is
reporting a deadline. Decision 0002 says the three rulings are the output; a
third column reading "no answer within 7s" is the platform in the panel's seat.

**Tightening the budget further.** Rejected. It is the same move a fourth time,
and each previous version passed its tests and failed live. The numbers were
never the problem: the shape was. Seven sequential-stage model calls do not fit
in thirty seconds with any arrangement of constants, and arranging constants
harder is how you get an app that works until a model is slow.

**Changing the committed allocation to fit — flash-lite everywhere.** Rejected,
and it was tempting: uniform flash-lite ran in 13.6 seconds and would fit
comfortably. But decision 0009 chose 3.7-flash advocates on measured grounds,
and reversing that for a platform constraint would mean the deployment quietly
deciding what the panel is. If the allocation ever changes it should change
because of what the runs show, not because of what Netlify will wait for.

**A paid plan.** Not investigated, and it would not have helped: the limit is
documented as not configurable and not plan-dependent, and the measured 30
seconds is smaller than the documented 60 rather than larger.

## What it costs

This is the honest half, and it is a real cost.

- **Errors no longer reach the browser.** A background invocation answers 202
  before any of the function's considered statuses — 400, 404, 422, 500, 503 —
  can be produced. Turn 012 built a last-resort handler precisely so the app
  would always speak for itself, and going background takes that channel away.
  Failures are now printed to the function log, and the visitor sees the page's
  poll time out. That is worse, and it is the price.
- **The page can no longer distinguish "still running" from "died".** Both look
  like nothing appearing. The timeout message says so in both directions rather
  than guessing.
- **A result the database rejects is invisible.** The run happened and was paid
  for; if `writeDeliberation` fails there is no longer a response to carry the
  `storage_warning` that used to appear.
- **Four minutes of polling for a twenty-second run.** The page gives up before
  the function does — the run has fifteen minutes and the poll has four — so a
  genuinely slow panel can complete into an archive nobody is watching. It is
  still there; the visitor has to reload.

## What it buys

- The panel is decided by the case and the models, not by a stopwatch.
- A mixed panel of four providers becomes usable, which is what the model picker
  was built for in turn 008 and what has never once worked in production.
- The archive endpoint earns its keep twice: retrieval, and polling.
- No further tuning. There is no constant left to get wrong.

## What would change this

A visitor-facing failure that the log-only channel makes unacceptable — at which
point the answer is a small synchronous validation endpoint in front of the
background run, not a return to synchronous deliberation.
