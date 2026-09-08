# 0012 — The frontend is React, with a build step

Status: accepted (Roy, 8 September 2026)
Date: 8 September 2026
**Supersedes 0008 — "The frontend has no build step".**

## The decision

`web/` is a React application built by Vite. `npm run build` produces
`web/dist`, which is what Netlify publishes. React, React DOM, Vite and
`@vitejs/plugin-react` are the project's first frontend dependencies.

Nothing outside `web/` changed. The four Netlify functions, `src/`, the nine
gates, the schemas and the database are untouched — this was a frontend swap,
not a rewrite, and that is the property that made it safe to do this late.

## Why, and what it was chosen over

0008 said: *"Revisit when the app grows past one screen. Not before, and not on
taste."* That condition is now met, and by requirements rather than preference.

- **Definition of done item 1** says a stranger can *"submit a charge sheet that
  satisfies `schemas/charge-sheet.schema.json`"*. The backend has always
  accepted one — `netlify/functions/deliberate.js` reads `body.charge_sheet` and
  puts it through G1 — and the page has never sent one. It only ever convenes
  `T-001` from the fixture. That is a second view.
- **`docs/01-spec.md` §4 already assumed the form existed.** G1's "will it
  actually fire?" column reads *"Yes — on every hand-authored case and every
  form submission."* The specification was describing a screen nobody built.
- **A third view** — a permalink per proceeding — follows from DoD 3 and is
  noted as optional rather than required.

**Staying on plain HTML.** Rejected, but it was defensible. `web/index.html` had
reached 600 lines of markup, CSS and JavaScript in one document, and three
views would have made it a thousand. The honest counter is that turn 013's
defect — three functions deleted by a rewrite that spanned them — is a symptom
of exactly that.

**React without Vite, from a CDN.** Rejected. It keeps "no build step" nominally
true while giving up JSX and module resolution, which are most of the reason to
use React at all.

**Waiting until after submission.** Considered and rejected by Roy: the build
cost that argued for waiting is one final deploy, which is negligible. Lesson 1
slide 7 names React and Vite as the course toolbox, so this also removes a
recorded deviation rather than adding one.

## What it costs

- **Four dependencies**, where `ajv` and `ajv-formats` were the only two.
- **A build step that can fail**, close to a deadline. It takes about a second
  and is exercised by `npm test`.
- **`npx netlify-cli dev` is now the only way to run the app locally** with a
  backend. `npm run dev:web` serves the page with no functions, so every fetch
  404s — an honest failure, but a new way to be confused.
- **The turn 013 test had to be rewritten**, and its replacement is a regex over
  each module rather than a parse of one script. See below: this cost is smaller
  than it looks, and larger than I first claimed.

## What it buys, and what it does not

This is the part I got wrong first and checked second, so it is written
precisely.

**The build catches an unresolved import.** Verified: renaming
`./components/Archive.jsx` to a file that does not exist fails the build with
`Could not resolve`, exit code 1. There is a test asserting it.

**The build does NOT catch an undefined identifier.** Also verified — and this
is the one that matters, because it is turn 013's actual bug:

```
totallyUndefinedFunction();   →   ✓ built in 651ms
```

It builds, deploys, and throws at runtime exactly as the old page did. So
*"the compiler replaces the symbol check"* would have been a false claim, and it
was in my first draft of this record. The check survives the migration, adapted
to run per module.

What React does genuinely buy here is **scope**. The turn 013 deletion was
possible because one 600-line script shared a single namespace and a rewrite
could span unrelated functions. Modules make that class of edit visible: each
file declares what it imports, and the deletion would now be an unresolved
import — which the build *does* catch.

## What would change this

Nothing foreseen. If the build ever becomes the reason a deadline is missed,
that is an argument about CI, not about the framework.
