# Turn 008 — A model per role

Date: 31 August 2026
Branch / commit: `main`, clean at the start.

## 1. Intent

Roy's suggestion: let a visitor choose the model for each of the seven roles
before the run.

Worth doing for a reason beyond the feature. "Progression from one model toward
several is visible" is a graded requirement, and until now the per-role
allocation was a comment in `config.js`. This makes it a thing a reader can see
and operate.

## 2. Specification

Three things had to be true or the feature backfires.

1. **The list lives on the server.** If the browser names a model and the
   function uses it, a public URL is an invitation to run seven calls of the
   most expensive model in the catalogue on this project's credit, repeatedly.
   An allowlist in `panel/models.json`; anything else refused.
2. **The committed default stays the default.** The progression argument rests
   on `modelMap()` moving from seven identical entries to several, as a diff
   with a decision record. A visitor's choice is an override for one run and
   changes nothing about the project's allocation.
3. **A mixed run is recorded accurately.** `deliberations.model` is a single
   string and becomes a lie the moment two roles differ — and `npm run compare`
   grouped by it, so it would have bucketed unlike runs together and called the
   result variance.

Roy's calls: cheap models only (all under $1/M input), and do the accurate
recording in the same turn rather than deferring it.

## 3. Context supplied

OpenRouter's `supported_parameters=response_format` filter — the correct one,
after turn 004 used the `structured_outputs` filter and 404'd twice on the
difference. `src/config.js`, `tools/compare.js`, `db/schema.sql`.

## 4. Plan

Allowlist → resolver with validation → `/api/models` → wire the function →
`model_map` through persist, schema, sink and compare → the picker → tests.
Approved.

## 5. Execution

New: `panel/models.json`, `src/models.js`, `netlify/functions/models.js`.
Modified: `src/config.js` (`resolveModelMap`, `ROLE_KEYS`), `src/deliberate.js`
(accepts overrides; **the provider is now handed the model rather than looking
one up** — a provider that chooses its own model makes a mixed run untraceable),
`src/providers/openrouter.js`, `src/persist.js`, `src/sinks/supabase.js`,
`db/schema.sql` (`model_map` column plus an `alter … if not exists` for the
database already created), `tools/compare.js` (groups by the whole allocation),
`web/index.html`, `tests/gates.test.js` (37 → 41).

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| An override must name a real role | Test, and live against the function | Pass — 422, `"judge.nobody" is not a role in this tribunal` |
| An override must name an allowed model | Test with `anthropic/claude-opus-5` | Pass — 422, `not an allowed model`, and the map keeps the default |
| A refused selection costs nothing | Test asserts `log.rows.length === 0` | Pass |
| A path-traversal string as a model | Live against the function | Pass — 422 |
| An override does not leak onto other roles | Test | Pass |
| Empty string means "use the default" | Test | Pass |
| Every allowlisted model is cheap and not a free tier | Test over `panel/models.json` | Pass — a `:free` entry would rate-limit four parallel calls |
| A run records all seven role→model pairs | Test | Pass |
| The picker renders | Browser | Pass |

### 6a. Two defects found by trying it in a browser

Both in turn 007's work, found the first time a real run was attempted through
the page. Turn 007's record says plainly that the success path had never run;
this is what that admission was worth.

**The invented timeout.** `netlify.toml` carried `timeout = 26` for the
deliberate function, written from a half-remembered figure without checking.
Netlify's synchronous limit is **60 seconds and is not configurable at all** —
so the setting invented a ceiling *below* the platform's and killed every
browser run at 35 seconds. Removed, with the real numbers written into the file
in place of the wrong one.

This is the third time in this project that a fact about an external service was
stated from memory instead of read: the `structured_outputs` filter (turn 004),
a model shortlist read out of a summarised API dump (turn 004), and now this.

**The error that hid the error.** The page called `res.json()` before checking
anything, so Netlify's HTML error page threw a parse error and the screen said
*"JSON.parse: unexpected character at line 1 column 1"*. The failure was a
timeout and the message named neither the timeout nor the status. Now the body
is read as text first; a 502 or 504 says so explicitly and shows the first 200
characters of whatever came back.

That is the same defect class as the unreadable G6 message in turn 002. An error
that replaces the real cause is worse than no error, because it sends you
looking in the wrong place.

### 6b. What the better error then revealed

`TimeoutError: Task timed out after 30.00 seconds` — from `lambda-local`.
**`netlify dev` is stricter than production**: 30 seconds locally against 60
deployed. So a run that production would allow could not be tested locally.

Fixed at the source rather than worked around: **the three judges now run
concurrently.** They are independent by construction — identical input, none
sees another, none is told another exists — so sequencing them bought nothing
and cost three times the wall-clock.

The part worth recording is that this was available from turn 002. The property
that makes concurrency safe is the same one the entire design rests on and
states in the paragraph directly above it in the spec. Nothing was ever in the
way. It stayed sequential because nothing made the waste visible until a
30-second cap did. **The constraint did not create the improvement; it revealed
one that had been sitting there.**

`docs/01-spec.md` §3 amended with Roy's approval, dated in place.

### What I did not verify

- **A complete deliberation through the browser.** Still none. After the
  concurrency change the local run was expected at ~20s; it timed out again at
  30s on a mixed panel of slower models, and the session ended before the cause
  was isolated. **The app has never rendered a real result.**
- **Whether the local 30s cap is configurable.** Could not be checked — a fetch
  limit was reached — and it is deliberately not guessed at, given §6a.
- **Anything deployed.** No Netlify site exists yet.
- **The copied-case gate and the allowlist refusal on real traffic.** Both fire
  only in tests.

## 7. Outcome

**Locked:** a visitor can compose a mixed panel from a server-side allowlist;
nothing outside it can be requested; a mixed run is recorded as seven role→model
pairs rather than one misleading string, in the file, in the database and in
`compare`.

**Open, and this is the honest headline: the app still has not completed a
single run.** Everything verified above is a rejection path. Next: measure the
concurrent run from the CLI to confirm the change is live, then deploy, where
the budget is 60 seconds rather than 30. If it strains there too, the remaining
answer is a background function with the page polling.

### Correction issued this turn

**Check a fact about an external service; do not recall it.** Three instances
now — two in turn 004, one here — and this one cost a working feature and a
session's debugging. The pattern is specific: numbers and parameter names for
services move, and a plausible memory of one is indistinguishable from knowing it.
