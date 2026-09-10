# Turn 027 — The Tribunal hears one case

Date: 10 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Roy: *"delete the option to add a new charge sheet, we will only have the page
for the charge sheet Gorsky provided."*

Turn 021 built that form and turns 023–025 hardened it. It is withdrawn.

## 2. Specification

- No submission path in the interface.
- **No submission path at all.** Removing the form is not the same as removing
  the feature: `/api/deliberate` is public and has accepted an inline charge
  sheet since turn 011, so anyone could still post one.
- **Definition of done amended the same day**, with a dated revision-log entry.
  A definition of done describing a feature the app does not have is the one
  failure that document exists to prevent.

## 3. Context supplied

`docs/00-framing.md` §3, `docs/GRADING-MAP.md`, the turn 021 and 023–025
records, and the lesson 9 material on prompt injection.

## 4. Plan

Remove the interface → shut the endpoint → amend the definition of done →
correct the grading map → say what it costs.

## 5. Execution

### Removed

`web/src/components/ChargeSheetForm.jsx`, `netlify/functions/validate.js`,
`src/cases.js`, `readCaseIds()` in the Supabase sink, the mode tabs and
submission state in `App.jsx`, `validateSheet()` in `api.js`, and the form's
stylesheet block. Four tests went with them.

### Shut, not merely hidden

`/api/deliberate` now answers **400** to a body carrying `charge_sheet`, and
takes `case_id` only. This is the part that matters: the form was one way to
reach that endpoint, and Module 17's *"a charge sheet can order the judge to
acquit"* is about the endpoint. Deleting a form while leaving the door open
would have removed the feature and kept the attack surface.

### Kept, and why

**The fence and G10 stay** (turn 023). The case fixtures are still untrusted-ish
data flowing into seven prompts — they are authored in this repository, so the
threat is much smaller, but the defence costs nothing now that it exists and is
documented in all eight prompt files. Removing it would mean editing those eight
files again to describe a message shape that had reverted.

**The generic advocate prompt stays** (turn 024), with `advocateOrder()` and
`modelMapForCase()`. Those are not form machinery: they are what stops the
*backend* naming T-001's four characters, which decision 0003 says nothing may
do. A second fixture would need them, and 0003 says `T-001` is the first of
several.

### What this costs, stated rather than skipped

**The app can no longer accept a case from anyone who cannot commit files.**
That is exactly what 0003 anticipated — *"a new case means new representatives
means new prompt files"* — and it is what definition-of-done item 1 used to
promise beyond it. Item 1 now says a stranger can **convene** a case this
repository holds, which is what the app does.

Item 7 is narrowed the same way: G1 still rejects an invalid charge sheet before
any model is called, with every violation named, but the only charge sheets that
exist are fixtures, so it is checked in the test suite and by `npm run check`
over `cases/*.json` rather than at a form.

**Both changes are in the framing document's revision log, dated, with the
reason.** Amending a definition of done downward on the day is honest in a way
that quietly leaving it is not; the course rules discard a trail assembled to
flatter the build, and a document claiming a form nobody can find is worse than
one that says the feature was withdrawn.

## 6. Verification

**89 tests pass. `npm run check` clean over 117 files. `npm run build` succeeds.**

One new test replaces the four that went: `the deliberate endpoint hears only
the cases in its repository`. It posts an inline charge sheet and requires a
400, checks that an unknown `case_id` is still a 404 — a different failure with
a different meaning — and asserts the browser bundle contains no way to
construct one and that both deleted files are gone.

### Not verified

- **The page has not been opened since the form was removed.** Build and tests
  only. The tabs are gone from `App.jsx` and the styles with them, but whether
  Part I reads correctly without them is a question for eyes.
- Three days of work on the form, the validate endpoint and the uniqueness check
  are now only in the history. That is not a defect; it is the cost of the
  decision, and the git log is where it stays legible.

## 7. Outcome

Done: the form and its server side removed, the endpoint shut, the definition of
done narrowed with a dated entry, the grading map corrected to claim what the
app does, one test in place of four.

Open, unchanged: the final deploy, evidence copies for turns 011–027, and the
live check in a private window.
