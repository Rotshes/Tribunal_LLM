# Turn 007 — A browser can open it

Date: 31 August 2026
Branch / commit: `main`, clean at the start.

## 1. Intent

Definition of done, item 1: *a stranger can open a public web address, submit a
charge sheet, and read the opinions — without being told how.* Until this turn
the Tribunal was a terminal program, which satisfies nobody in that sentence.

Note what forces this: Gorsky's fixed specification for the running project does
**not** require deployment. It names the panel, the non-combining protocol, the
charge sheet, the cases, OpenRouter, the seven prompts and the model
progression, all of which already existed. The public URL is in
`docs/00-framing.md`, which is ours. Revising a definition of done to match what
was actually built is the move that reads worst to a grader, so the app gets
built instead.

## 2. Specification

- Two Netlify functions and one HTML page. The functions are **thin**: every
  decision already lives in `src/` and is tested there.
- **G1 runs before the provider is even constructed.** A malformed charge sheet
  must cost nothing, and the response must say so.
- Missing configuration returns 503 as an *operator* error. It must not read as
  a failed deliberation.
- The three judges always occupy three columns in fixed order. **A failed judge
  keeps its column and is displayed as a failure.** Two rulings must never be
  able to look like the answer.
- No combined result anywhere in the response or the page.

## 3. Context supplied

`docs/00-framing.md` §3, `docs/01-spec.md` §3, `src/deliberate.js`,
`src/sinks/supabase.js`, decisions 0002 and 0005, and Netlify's current
functions documentation.

**Roy's decision, taken before any code:** plain HTML, CSS and JavaScript with
no build step, rather than React and Vite. Recorded as
`docs/decisions/0008-the-frontend-has-no-build-step.md`, with the revisit
condition stated — a second screen or shared state.

## 4. Plan

`netlify/functions/deliberate.js`, `netlify.toml`, `web/index.html`. Approved.

Changed during execution: the page originally fetched the charge sheet from
`/cases/…json`, which Netlify would never serve because only `web/` is
published. Copying the fixture into `web/` would have created two charge sheets
that drift, and the one the reader saw would eventually not be the one the
models were given. Added `netlify/functions/case.js` instead — one source.

## 5. Execution

New: `netlify.toml`, `netlify/functions/deliberate.js`,
`netlify/functions/case.js`, `web/index.html`,
`docs/decisions/0008-the-frontend-has-no-build-step.md`.
Modified: `README.md`.

## 6. Verification

Both functions were exercised with real `Request` objects, no network, no models:

| Case | Expected | Result |
|---|---|---|
| `GET /api/case?id=T-001` | 200, the case | Pass |
| `?id=../../etc/passwd` | Refused | Pass — 400. The id is pattern-checked, never path-joined from input |
| `?id=T-999` | 404 | Pass |
| `GET /api/deliberate` | 405 | Pass |
| Unknown case id | 404 | Pass |
| Charge sheet missing `issue` | 422, naming the field, nothing spent | Pass — `spent: "nothing"`, and the provider was never constructed |
| No `OPENROUTER_API_KEY` | 503 operator error | Pass — "The tribunal is not configured", not a failed deliberation |

### What I did not verify, and it is the important part

**No deliberation has ever completed through the browser.** Every check above
is of the paths that reject something. The path that succeeds — seven real
calls, rendered — has never run end to end. Two defects were found immediately
afterwards while trying it (turn 008 §6a), which is the evidence that this
section is not a formality.

Also unverified: the failure display with a genuinely failed judge (only the
stub has produced one), the ~35s wait as an actual experience, and anything
about how this behaves deployed.

## 7. Outcome

**Locked:** the shape. Functions that decide nothing, a page with no build step,
one charge sheet source, three judge columns in fixed order, and a failed judge
that says *"This is a failure, not an acquittal. The other rulings are not the
outcome of the case."*

**Open:** it has not run. Deployment. RLS still has no read policy, so
definition-of-done item 3 — a case retrievable by someone who did not submit it
— is not met.

### Correction issued this turn

**A stale statement was found in `README.md`**, not in code: the status section
still said the three judges converge, which turn 004 had corrected. Fourth
stale statement found in a context or spec file this session. They drift because
nobody re-reads the parts that are not currently being edited, and finding them
has been a side effect of unrelated work every time.
