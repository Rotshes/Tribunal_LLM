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
| Every name the page calls is defined in it | Test parses the module; verified by deleting `loadArchive` and watching it fail | Pass |
| Every allowlisted model records what it was observed to do | Test asserts a verdict and a date on each | Pass |
| The picker warns about models observed to fail | Test | Pass |
| The four-provider panel completes without a platform error | Live run, 31.08 | Pass — 4 of 7 calls succeeded, 3 failed for model reasons (§6d) |
| A rejection report carries no account id and pastes as valid JSON | Test against a real 400 body | Pass |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 66 tests, 82 files |

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

### 6c. I deleted three functions and shipped it

The first live run of the background design made all seven calls, wrote the run,
and then threw **`loadArchive is not defined`** — after the money was spent. Past
proceedings rendered nothing.

The rewrite of `run()` in §5 replaced everything between `async function run()`
and the click handler. `renderArchive`, `openRun`, `loadArchive` and the `SHORT`
label map lived in that span. They went with it.

Nothing caught this. The page has no build step by decision 0008, so there is no
compiler; no test had ever read `web/index.html` as code; and the deletion broke
only the path that runs *after* a successful deliberation, so it could not fail
until a real run succeeded.

Two fixes, and the second matters more:

1. The four are restored, and moved **above** `run()` so a future rewrite of
   `run()` cannot reach them.
2. A test now parses the page's module and checks that every name it calls is
   declared in it. Verified by deleting `loadArchive` again and watching it
   fail with exactly that name.

Decision 0008 said the cost of no build step is that discipline replaces a
compiler. That cost came due here, and the answer is the cheapest possible
stand-in rather than a bundler.

### 6d. The four-provider panel ran, and the models were the problem all along

The panel this whole sequence was for — Gemini 3.7, Solar Pro 4, GPT-5.6 Luna,
Qwen 3.7, flash-lite — **ran to completion with no platform error of any kind.**
Nothing was cut off, nothing timed out, no 502 and no 504.

3 of 7 calls failed, and every one of them failed for a reason belonging to a
model:

| Role | Model | What happened |
|---|---|---|
| `daenerys_targaryen` | `openai/gpt-5.6-luna` | OpenRouter 404 — "no endpoints found that can handle the requested parameters" |
| `barak_model` | `openai/gpt-5.6-luna` | the same 404 |
| `tyrion_lannister` | `upstage/solar-pro4` | routed fine, returned prose; caught by G2 |

Each appeared as a failed seat or a failed column with the reason on it, beside
four working advocates and two rulings. That is precisely the behaviour decision
0002 and the "failure is shown as failure" rule have specified since turn 002,
and the first time all of it has been true in production at once.

**And it exposed a false claim in `panel/models.json`.** That file said every
entry was verified by appearing under
`openrouter.ai/models?supported_parameters=response_format`. I fetched that list
during this turn: **all five of ours are on it**, including the one that 404s
every time.

The reason is the distinction turn 004 already found and this file did not
absorb: `response_format` support is per **endpoint**, not per model, and
`require_parameters` restricts routing to endpoints supporting everything sent.
A model can be catalogued as supporting the parameter and have no routable
endpoint that does. It can also route successfully and ignore the parameter,
which is what Solar Pro 4 did.

So the verification note was true about the catalogue and false about the world.
Every entry now carries an `observed` field — verdict, what happened, and the
date — and the file says plainly that the catalogue flag is not evidence. The
picker reads it: options show "· known to fail" or "· unreliable" in the
dropdown, because offering a broken model identically to a working one is a
trap rather than a choice.

Two models are left on the list rather than removed. A visitor who picks Luna
gets an instant, free, clearly-labelled failed seat, and that demonstrates the
failure path better than a quietly shorter menu would.

### 6e. A tool so the next model is verified rather than assumed

`npm run try-model -- <id>` makes **one** call — a real judge prompt, the
longest and most structured of the seven — parses the answer, runs G2 over it,
and prints the `observed` line to paste into `panel/models.json`.

It exists because the alternative was me adding candidate models on the strength
of a price table, which is exactly the mistake §6d found. Three candidates from
providers the panel does not yet have are noted for Roy to try:
`deepseek/deepseek-v4-flash-0731`, `inclusionai/ling-3.0-flash`,
`nvidia/nemotron-3.5-lightning`. None of them is in `panel/models.json`, because
none has been run, and the test added earlier this turn would refuse them.

**Its first real run rejected a candidate.**
`deepseek/deepseek-v4-flash-0731` — the cheapest option on the shortlist, from a
provider the panel does not have — returned nothing in 120 seconds. One call,
one clear answer, and a model that would have been added on the strength of a
price table was not.

`inclusionai/ling-3.0-flash` went the same way for a more interesting reason:
it answered in 29 seconds with valid JSON that **omitted the required
`reasoning` field**. It can produce the shape and not the substance, which is
the harder failure to catch — a prose response is obvious, a structurally valid
opinion with a missing element is not. G2 caught it in one call.

Rejections are recorded too, in a `$rejected` block in `panel/models.json`.
Without it the next person re-runs the same candidate, and the menu's shortness
looks like an oversight instead of a result.

**The tool leaked an account id.** On a 400, it printed OpenRouter's error body
straight into the line offered for pasting into `panel/models.json` — and that
body contains `user_id`. The suggested line therefore carried an account
identifier headed for a public repository, alongside unescaped double quotes
that would have broken the file on paste.

Neither is the model's fault and neither belongs in a record of what a model
did. The report is now sanitised — identifiers dropped, the useful sentence
kept — and the pasteable line goes through `JSON.stringify` rather than string
concatenation. A test asserts both.

The general shape: **a tool that formats output for a committed file is
handling untrusted input**, because the provider wrote half of it. I treated it
as a print statement.

**One candidate passed.** `nvidia/nemotron-3.5-lightning` produced a valid judge
opinion in 14.4 seconds and is now on the allowlist — the only entry there that
earned its place **before** being added rather than after. The list is six
models across five providers, four of which work:

| Model | Provider | Observed |
|---|---|---|
| `google/gemini-3.5-flash-lite` | Google | works — the committed judge model |
| `google/gemini-3.7-flash` | Google | works — the committed advocate model |
| `qwen/qwen3.7-flash` | Qwen | works |
| `nvidia/nemotron-3.5-lightning` | NVIDIA | works |
| `upstage/solar-pro4` | Upstage | unreliable — returns prose |
| `openai/gpt-5.6-luna` | OpenAI | fails — no routable endpoint |

Three candidates were rejected on one call each: DeepSeek (no answer in 120s),
Ling (JSON without `reasoning`), and — not a real observation — a mistyped
NVIDIA id that OpenRouter refused in 0.3 seconds.

Five candidates evaluated, one added, three rejected with dated reasons, and a
mistype identified as a mistype. That is a short menu that was questioned rather
than a short menu that was never examined, and the difference is legible in the
file.

Two things about it are worth stating rather than leaving to be discovered:

- **It bypasses the allowlist deliberately.** That is safe because it is a
  terminal tool and nothing under `netlify/` imports it. The allowlist stops a
  visitor spending the project's credit on a model they named; it must not stop
  the maintainer evaluating a candidate. The file says so at the top.
- **G5 fired on it.** The first draft held the outcome in a variable called
  `verdict`, which the gate forbids repository-wide. It was about a model rather
  than a case, so the gate was arguably over-broad — and renaming a local
  variable costs nothing while an exemption in the gate guarding decision 0002
  costs the gate. Renamed, same call as the G8 fixture in turn 012.

### What I did not verify

- ~~**That the 202 path works on Netlify.**~~ Confirmed live: a background run
  made all seven calls and the page polled the archive and found it.
- ~~**The polling behaviour under a real run.**~~ Confirmed by the same run.
- ~~**The four-provider mixed panel.**~~ Ran, completed, and failed only where
  models failed. See §6d.
- **The restored archive, live.** Broken by §6c and fixed here; the fix is
  verified by a test, not by a browser.
- **Whether Solar Pro 4 always returns prose.** One observation. It may be
  intermittent, which is worse than always failing and is not distinguishable
  from a single run.
- **Whether Luna's 404 is permanent.** Endpoint availability moves. The
  `observed` field is dated for that reason.
- ~~**`npm run try-model` against a real model.**~~ Run: it rejected
  `deepseek/deepseek-v4-flash-0731` on a 120-second timeout.
- **That Nemotron works more than once.** One call. It is on the allowlist on
  the strength of a single observation, which is exactly what the tool's own
  closing line warns about. The `observed` field is dated so the claim's age is
  visible.
- **Nemotron in a full seven-call run.** It answered a judge prompt; it has
  never argued an advocate seat, where the prompt differs.
- **Whether DeepSeek's timeout is capacity or the model.** One call at one
  moment. The rejection is dated for that reason; it is not a permanent verdict
  on the model.
- **Whether four minutes is the right give-up.** Chosen to be much longer than
  a normal run and much shorter than fifteen minutes. Not derived.

## 7. Outcome

**Locked:** the deliberation is asynchronous, and no constant in this repository
decides how many judges sit.

**Open:** the restored archive is verified by a test rather than a browser.
Single observations for both failing models. G3, still.

**Next turn:** close the project out — `docs/PRE-SUBMISSION.md`, the evidence
folder, and the README's missing public URL.

### Correction issued this turn

**When the fourth attempt at a constant is due, the constant is not the
problem.** Three budgets failed and the fourth "worked" by cutting a judge off.
Each iteration made the number better and none questioned whether the run
should be racing a clock at all. The signal to look for is a fix that keeps
being nearly right.
