# Turn 021 — The charge-sheet form

Date: 8 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Definition-of-done item 1 has read **PARTIAL** since turn 007: *"a stranger can
open a public web address, submit a charge sheet that satisfies
`schemas/charge-sheet.schema.json`, and read the opinions — without being told
how."* Reading was done. Submitting was never built. The backend has accepted an
inline charge sheet since turn 011 and nothing ever sent one.

## 2. Specification

- A form producing a typed object that satisfies the schema, not three free-text
  fields (`docs/02-charge-sheet-spec.md`).
- **DoD 7:** an incomplete charge sheet produces a message naming the missing
  field, before any model is called, and costs nothing.
- Every violation reported at once, not the first.
- `case_id` unique among stored cases — validation order step 2, specified
  24.08.2026, never implemented.
- Nothing whose correctness must hold lives in the browser.

## 3. Context supplied

`docs/02-charge-sheet-spec.md`, `schemas/charge-sheet.schema.json`,
`src/gates.js`, `netlify/functions/deliberate.js`, `db/schema.sql`,
`src/sinks/supabase.js`, and the DoD list in `docs/00-framing.md`.

## 4. Plan

Read the spec → find what the form breaks → fix that server-side → then the
form. Put to Roy before any code was written; he chose the duplicate-id policy.

## 5. Execution

### The form exposed two defects before a line of it was written

**1. The background function cannot reject anything to a browser.**
`/api/deliberate` is `background: true` (0011). It answers **202 with an empty
body** before its own `g1ChargeSheet` call runs, so the 422 carrying `problems`
is written to a response nobody reads. Turn 013 recorded that cost for unhandled
errors; a form makes it bite on the ordinary path, and **DoD 7 is unreachable
through it**. A background function cannot say anything to a browser.

So: `POST /api/validate`, synchronous, importing the same `g1ChargeSheet` from
`src/gates.js`. Not a second implementation — the same function, schema and ajv
instance — and `/api/deliberate` still runs it, so a POST that skips the form is
still gated. Two doors, one gate. It calls no model and writes nothing, so a
submitter may hammer it for free, which is the point.

**2. `case_id` uniqueness was specified and never implemented, and it is now
dangerous.** The Supabase sink sends `Prefer: resolution=merge-duplicates` — it
**upserts**. A visitor submitting as `T-001` would have overwritten the
instructor's case in place, and every stored opinion cites `agreed_facts` **by
index**. `db/schema.sql` says it outright: reordering or deleting an entry
silently invalidates every opinion already stored against the case. Thirty-odd
archived opinions would have kept rendering, kept citing "fact 3", and been
citing a different fact.

`src/cases.js` implements the check. Roy chose: reject, and name the lowest free
id. The fixtures are checked from disk and the stored ids from the database, and
when the database cannot be read — Supabase pauses itself after seven quiet days
— the response **says the check was partial** rather than pretending. The
fixtures are checked either way, and those are the cases that cannot be replaced.

### The form

Three rules, each removing a class of failure rather than reporting it:

- **It does not offer what the project forbids.** `imposes_sentence`,
  `combines_opinions` and `fictional` are constants the schema pins. A field
  with one permitted value is not a question, it is a trap. Asserted and
  displayed, never editable — a form offering `combines_opinions` as a choice
  offers something decision 0002 forbids outright.
- **Seats are fixed 2 defense / 2 prosecution.** G1 requires exactly that
  balance, so a seat control exists only to be got wrong.
- **Bounds are visible while typing.** `background` is 200–400 **words** and a
  brief is 100–1200 characters — invisible constraints a submitter otherwise
  discovers by being rejected.

Submitting **does not start a deliberation**. It validates; a sheet that passes
becomes the case shown above the panel picker, so the submitter reads back what
the seven models will be given and presses Convene themselves. Nobody should
learn their sheet was accepted by being charged for seven calls.

## 6. Verification

**81 tests pass. `npm run check` clean over 110 files. `npm run build` succeeds.**

Four new tests, each verified by breaking it:

| Test | Broken by | Fired |
|---|---|---|
| a taken case id is refused with a free one named | disabling the uniqueness check | yes |
| the form restates no bound the schema does not hold | changing `act_alleged` max to 500 | yes |
| the form offers nothing the project forbids | making the seats 1/3 | yes |
| a sheet cannot become the active case before G1 | moving `setOwnSheet` above `validateSheet` | yes |

The bounds test is the one worth naming. The form prints character and word
limits beside the fields they constrain — a **second statement of the schema**,
and this project has had one contract stated twice and drift four times
(`CLAUDE.md`). So the numbers are checked against
`schemas/charge-sheet.schema.json` directly, and the word bounds — which no JSON
Schema can express — against the code in `g1ChargeSheet` that enforces them.

**A false positive in my own test, again.** The first version of that test
rebuilt the whole `BOUNDS` object literal into JSON with two regexes and failed
on its own quoting. Not the code's fault; the test's. Replaced with a per-entry
regex that cannot misread. Third time this turn-pair that a test broke for a
reason unrelated to what it checks.

### Not verified

- **Nothing has been submitted through the form against a real backend.** It is
  covered by unit tests and a build, not by a person filling it in. The
  validate endpoint was exercised directly with the fixture, a fresh id, a
  duplicate id and a broken sheet; the React form was not driven in a browser.
- **No deliberation has been run on a submitted case.** The inline path through
  `/api/deliberate` has been there since turn 011 and is still unexercised end
  to end.
- The uniqueness check has never run against a live Supabase — only against
  injected id lists and the fixtures on disk.
- Whether a stranger can actually complete this form without being told how.
  That needs a stranger, and it is the DoD's own wording.

## 7. Outcome

Done: `/api/validate`, `src/cases.js`, `readCaseIds()`, the form, the page
wiring, the styles, four tests, and `docs/GRADING-MAP.md` corrected.

**DoD 1 is built and is not yet true.** The live site still serves the turn-017
bundle, because builds are paused. The grading map says PARTIAL until the final
deploy rather than claiming a form nobody can reach — the same correction turn
014 had to make when the map reported a form that was never built.

Open: the final Netlify deploy, evidence copies for turns 019–021, and one run
through the form against the live backend to close the "not verified" list above.
