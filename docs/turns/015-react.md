# Turn 015 — React, and a claim I nearly made

Date: 8 September 2026
Branch / commit: `main`. Netlify builds are paused until one final deploy.

## 1. Intent

Roy asked to move the frontend to React, redesign it, and make the Convene
button larger and more obvious.

The last two are uncontroversial. The first reverses decision 0008 — *"the
frontend has no build step"* — and adds the project's first frontend
dependencies, both of which are on the stop-and-ask list. Asking produced a
better reason than the one I had:

**0008's own revisit condition is met.** It said *"revisit when the app grows
past one screen. Not before, and not on taste."* Definition of done item 1
requires that a stranger can **submit a charge sheet**, the backend has always
accepted one (`deliberate.js` reads `body.charge_sheet` and puts it through G1),
and the page has never sent one — it only ever convenes `T-001` from the
fixture. `web/index.html` contained the string `charge_sheet` zero times.
`docs/01-spec.md` §4 had already assumed the form existed: G1's "will it fire?"
column reads *"on every hand-authored case and every form submission."*

So `docs/GRADING-MAP.md` was reporting DoD 1 as **DONE** for a screen nobody
built. That was my overclaim, from turn 014, and it is now **PARTIAL** with the
reason attached.

This turn is the migration only. The redesign and the form are turn 016 —
porting and redesigning at once leaves nothing to compare against.

## 2. Specification

- Same behaviour, same screens, same words. The CSS moves verbatim, so anything
  that looks different afterwards is a bug rather than a choice.
- Nothing outside `web/` changes.
- Turn 013's page-symbol test is replaced by something that actually covers what
  it covered.

## 3. Context supplied

`web/index.html` in full, decision 0008, `netlify.toml`, the failing tests, and
Netlify's build settings.

## 4. Plan

Scaffold → port one component per render function → repoint the tests → new
decision record → this record.

## 5. Execution

`web/` is now a Vite React app:

| File | Was |
|---|---|
| `web/index.html` | the entire application; now a 20-line Vite shell |
| `web/src/styles.css` | the `<style>` block, moved verbatim |
| `web/src/api.js` | the four `fetch` calls and the polling loop |
| `web/src/panel.js` | `JUDGES`, `RULING`, `LABEL`, `describeModels`, `health` |
| `web/src/App.jsx` | `run()`, `openRun()`, the state that was module-level `let` |
| `web/src/components/*.jsx` | one component per render function — ChargeSheet, ModelPicker, Waiting, Banner, Advocates, Rulings, Archive |

`vite.config.js` — root `web`, output `web/dist`.
`netlify.toml` — `command = "npm run build"`, `publish = "web/dist"`; the `[dev]`
block runs Vite behind `netlify dev` so `/api/*` still reaches the functions.
`package.json` — react, react-dom; vite and `@vitejs/plugin-react` as dev
dependencies; `build`, `dev:web`, `preview`.
`docs/decisions/0012` — the reversal. 0008 marked superseded and left unedited.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| The app builds | `npm run build` | Pass — 1.4s, 204 kB js / 7.6 kB css |
| Every user-visible string survived the port | Twenty phrases from the old page checked against the new modules | Pass |
| The polling contract is intact | Test, repointed at `web/src/api.js` and `App.jsx` | Pass |
| The picker still warns about failing models | Test, repointed at `panel.js` and `ModelPicker.jsx` | Pass |
| Undefined identifiers are still caught | New per-module test; verified by reintroducing turn 013's bug | Pass — names `totallyUndefinedFunction` |
| The build catches an unresolved import | New test; renames a component import and asserts the build fails | Pass |
| Nothing outside `web/` changed | `src/`, `netlify/functions/`, `schemas/`, `db/` untouched | Pass |
| The app runs and is unchanged to look at | `npx netlify-cli dev`, Roy | Pass — "it runs and looks the same" (§6c) |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 69 tests, 99 files, G5, G8, G9 |

### 6a. The claim I nearly made

My first draft of decision 0012 said the compiler replaces turn 013's
page-symbol test. It was the obvious thing to write — a build step is exactly
the compiler 0008 said it was giving up — and I checked it before writing it
down, which is the only reason it is not in the record.

Two probes, both against the real build:

```
totallyUndefinedFunction();            →   ✓ built in 651ms      (exit 0)
import … from './NoSuchFile.jsx'       →   Could not resolve     (exit 1)
```

**The build does not catch an undefined identifier.** It builds, deploys, and
throws at runtime exactly as the old page did — which is precisely turn 013's
bug, still available. Vite catches an unresolved *import*, and nothing more.

So the test survives the migration, adapted: it now reads each module in
`web/src`, collects what that module imports or declares, and asserts every name
it calls is one of them. Modules make it sharper rather than weaker, because
scope is per file instead of one shared soup. I verified it by reintroducing
turn 013's deletion and watching it name the identifier.

What React does genuinely buy is that the *shape* of turn 013's mistake changes:
deleting a function that another module imports becomes an unresolved import,
which the build does catch. That is a real improvement and a much smaller claim
than the one I started with.

### 6b. Two false positives, and why they mattered

The new test failed first on eleven names — `setCharge`, `setRuns`,
`setArchiveError` and the rest. All of them are `useState` pairs, declared by
array destructuring, which the declared-name scan did not read. It also flagged
`async` from `(async () => {`.

Worth fixing carefully rather than loosening: a check that reports work which
does not exist gets switched off, and then the real defect it was written for
goes through. Same reasoning as the `(1300)` false positive in G9 last turn.

### 6c. Run locally: it looks the same

Roy ran `npx netlify-cli dev` and reported the app **looks the same**, which is
this turn's success criterion stated as a sentence. The port is behaviour-only,
so identical is the correct outcome and anything else would have been a defect.

That closes three of the four gaps this section listed before it was run: the
React version renders in a browser, the new `[dev]` block works (Vite behind
Netlify, `/api/*` still reaching the functions), and the CSS still applies —
`className` was carried across correctly or the page would have been unstyled.

One wrinkle worth recording because it will happen to anyone cloning this
repository: the first `npx netlify-cli dev` failed with `'vite' is not
recognized`. The dependencies are new and `npm install` had not been run. That
is the cost decision 0012 lists as "four dependencies" arriving in a concrete
form — before this turn, cloning and running needed nothing.

### What I did not verify

- **A live deliberation through the React page.** It loads and the archive
  renders; nobody has pressed Convene since the migration. The polling path is
  the same code as before, moved, but "moved and unchanged" is an argument
  rather than an observation.
- **Anything about how it looks.** Deliberately: this turn changed the stack and
  nothing else.

## 7. Outcome

**Locked:** the frontend is React built by Vite. Decision 0012 supersedes 0008,
on 0008's own revisit condition. DoD 1 is honestly reported as PARTIAL.

**Open:** no deliberation has been convened through the React page. The
charge-sheet form and the redesign. The final deploy.

**Next turn:** the redesign, the Convene button, and the charge-sheet form.

### Correction issued this turn

**A build step is not a type checker, and "the compiler catches it" is a claim
to test rather than assume.** I was one paragraph from writing into a decision
record that the migration removed a class of defect it does not remove. Two
thirty-second probes were the difference between a record that is true and one
that reads well.
