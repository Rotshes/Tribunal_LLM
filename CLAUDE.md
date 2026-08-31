# The Tribunal

## Stop and ask me before you do any of these

- Change anything in `docs/00-framing.md`, `docs/01-spec.md`,
  `docs/02-charge-sheet-spec.md`, or `docs/decisions/`. These are mine. You may
  draft into them when I ask; you may not revise them on your own initiative.
  (`docs/turns/` is the exception — the turn record is your job.)
- Add a dependency, a service, or a new model provider.
- Change the database schema, or either file in `schemas/`.
- Change any prompt in `prompts/`. Prompts are behaviour; a prompt edit is a code change.
- Delete or rewrite a file you did not create in this session.
- Push to `main`, deploy, or run anything that spends money outside the per-run cap.

When you hit one of these, stop and state the decision you need from me. Do not
pick the reasonable-looking option and continue.

---

## What this project is

A web app that takes a charge sheet, has four AI advocates argue opposing sides,
has three AI judges rule on those arguments, and shows **the three rulings side
by side** — each with its own reasoning, never combined into one.

Coursework for ASE-26 (Agentic Software Engineering, Mikael Gorsky). The course
grades how well the agent is directed, not the app that ships. The written
record in this repo is the deliverable; the app is the occasion for producing it.

**The case domain is fixed**, supplied 24.08.2026: `T-001 — The Realm v. Jon
Snow`, four representatives in two seats, three judges defined by method. It
lives in `cases/` and the advocate prompts **as data** — nothing in the schema,
backend, database or interface names a character. `T-001` is the first of
several; keep it that way. (decision 0003)

## The build

- Browser: the charge sheet form and the opinion display.
- Backend: holds the OpenRouter key, the rubric, the prompts. Calls the models.
- Database (Supabase/Postgres): charge sheets, opinions, and one row per model
  call — model, role, **its own ruling**, tokens in and out, cost, latency.
  There is no column anywhere for a result derived from the three.
- Deployment: Netlify.

The OpenRouter key never reaches the browser. Nothing whose correctness must
hold lives in the browser.

## Settled decisions

Do not reopen these without asking. Reasoning is in the record named after each.

- **The three rulings are never combined** — no majority, headline, score,
  average, or "2 of 3 agree". Any output reducing three rulings to one violates
  the fixed course specification. If you find yourself computing a single result
  from the three, stop. (0002)
- **Every model call is logged, including failures** — the failures are the
  interesting rows. (0001)
- **Model allocation:** one model for all seven calls to begin with, then a
  deliberate progression toward several, driven by the per-call logs. The
  progression must be visible in the commit history; it is graded.
- **Failure is shown as failure** — never as a ruling, never silently defaulted
  to acquittal. A blank result that reads as an answer is the worst thing this
  app can produce.
- **The seat does not fix the position.** An advocate's seat sets its procedural
  role only. No gate, schema rule, prompt line or retry may require an advocate
  to conclude in favour of its own seat. Divergence is reported, never blocked. (0004)
- **The judges are methods, not people.** No prompt tells a model to speak as a
  named person. The disclaimer is a required field on every judge opinion, not a
  page footer. No citations — a fabricated citation attributed to a real judge is
  the harm being prevented. (0005)
- **All three judges receive identical input** and never see each other.
  Load-bearing: identical input into three methods is the only arrangement in
  which a divergent ruling means anything.
- **Validation runs the schema files directly** rather than restating them in
  code. (0006)

## How to work here

- Write the plan before the code. I read plans; it is the cheapest place to
  catch a misunderstanding.
- One turn does one thing. A turn touching schema, prompts and UI at once
  cannot be reviewed.
- **Commit before I invoke you, not only after**, so the diff is attributable to
  the turn. Remind me if I forget. Graded directly.
- Commit again at the end. Atomic — one change, one commit — and the message
  names the intent, not the diff. Never overstate what was done.
- **Every turn ends with a record in `docs/turns/`**, written during the turn,
  never reconstructed later. A retrofitted trail loses marks even when the build
  is sound. See `docs/turns/TEMPLATE.md`.
- **A gate must be able to fail.** One that has never caught anything, and could
  not, counts as no gate at all — and "written but never fired on real input" is
  *unproven*, not passing.
- **Before writing a gate, say out loud what it would forbid**, and check the
  specification actually forbids it. A gate can enforce the opposite of the spec
  while looking like verification, and once green nobody re-reads it. (0004)
- **A gate that exempts the code it exists to check is decoration.** Scan
  everything; mark legitimate exceptions with a visible per-line pragma and a
  reason. A whole file quietly excluded is a hole nobody can see.
- **When a rule is stated in two places, add a check that they agree — or delete
  one statement.** Three silent prompt-versus-schema disagreements in three turns.
- **Where prompt and schema describe different shapes, the schema wins and the
  prompt is decoration.** A prompt asking for ordered tests against a schema
  offering `string[]` produces bullet points. If behaviour must differ, the
  *contract* must differ, not just the instructions.
- When I correct you, ask whether the correction belongs here as a standing
  rule. A correction that lives only in the chat is gone next session.

## What good work looks like here

- A success criterion is good when two people reading the result could not
  disagree about whether it was met.
- A specification is good when it settles what you would otherwise guess at. If
  you are guessing, that is a gap — say so rather than filling it.
- Documentation is good when it says *why*. You can describe the code
  accurately; you cannot know why I chose it. Ask me.
- An interface is good when a stranger knows what to do next without being told.
- Slow, failed and empty states are part of the design. A build that handles
  only the happy path is not finished.

## Things that have gone wrong before

One line per failure actually observed. Written once, permanently.

- **Prompt and schema disagreeing, silently — three times.** 24.08 `responds_to`
  (prompt demanded two advocates answered, schema allowed one). 24.08 provenance
  fields (prompts forbid the model emitting them, schema required them — all
  seven calls failed). 31.08 the judges' `grounds` array flattening three
  distinct methods into one shape. Assume it is happening again somewhere.
- 24.08 — Reached for a gate requiring each advocate to conclude in favour of its
  own seat: the exact thing the simulation rule forbids, and it would have sat in
  the suite looking like diligence.
- 24.08 — Miscounted the agreed facts as six when there are five. The indices are
  load-bearing. Count the record, do not remember it.
- 24.08 — The first G5 skipped all of `src/`, the only place a combined result
  could be introduced. It would have passed forever.
- 31.08 — `config.js` read `TRIBUNAL_MODEL` at import time; imports evaluate
  before the importing module's body, so the map was built before `.env` was
  read. Read configuration when needed, never at module scope.
- 31.08 — The `.env` parser split on `\n`, leaving a carriage return on every
  value on Windows. Anything reading a file must assume CRLF.
- 31.08 — `response_format` support on OpenRouter is per **endpoint**, not per
  model. Without `provider: { require_parameters: true }` a call is routed to an
  endpoint that ignores it: request succeeds, prose comes back, you pay.
  Intermittent, and invisible without G2.
- 31.08 — A judge paraphrased its own disclaimer. Anything whose exact wording
  matters must be attached by the runner and compared, never requested.
- 31.08 — Every judge cites every fact, every run, so G3 has never fired on real
  output.

## Conventions

- Prompts: `prompts/`, one file per role. **Stable paths** — a new version bumps
  the `version` header in place and adds a changelog row, so `git diff` shows the
  text change. Never `…-v2.md`. Every call row records the declared version *and*
  a SHA-256 of the file, so an edit without a bump is detectable.
- Cases: `cases/*.json` as repository fixtures, not only in the database. A case
  that exists only in the database is not evidence anyone can open.
- `agreed_facts` order is permanent. Opinions cite by index; a correction
  appends, never rewrites or reorders.
- Secrets live in the environment, never the repo. Check before committing.
- Hard cap on calls per deliberation; a run that exceeds it aborts.

---

## Before you finish any turn

1. Check the output against the written success criteria, point by point.
   Not "does it run" — does it meet what was written.
2. Say plainly what you did not verify. An unverified claim stated confidently
   is worse than an admitted gap.
3. Write the turn record.

Do not report a task as done because it looks done to you.
