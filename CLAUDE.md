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
Snow`. It lives in `cases/` and the advocate prompts **as data** — nothing in
the schema, backend, database or interface names a character. `T-001` is the
first of several; keep it that way. (0003)

## The build

Browser (form and display) → backend (holds the key, the prompts, calls the
models) → Supabase/Postgres → Netlify.

One row per model call: model, role, its own ruling, tokens in and out, cost,
latency. **No column anywhere for a result derived from the three.**

The OpenRouter key never reaches the browser. Nothing whose correctness must
hold lives in the browser.

## Settled decisions

Do not reopen without asking. The reasoning is in the numbered record; these
lines are the rule, not the argument.

- **The three rulings are never combined** — no majority, headline, score,
  average, or "2 of 3 agree". If you find yourself computing one result from the
  three, stop. (0002)
- **Every model call is logged, failures included** — the failures are the
  interesting rows. (0001)
- **All three judges receive identical input** and never see each other.
  Load-bearing: it is the only arrangement in which divergence means anything.
- **Failure is shown as failure** — never as a ruling, never defaulted to
  acquittal. A blank result that reads as an answer is the worst output possible.
- **The seat does not fix the position — but it does fix that the case gets
  argued.** No gate, schema rule, prompt line or retry may require an advocate to
  conclude in favour of its seat; divergence is reported, never blocked (0004).
  Every advocate does argue `case_for_seat` in good faith regardless of where it
  personally lands, because without that the unpopular side went unargued in
  three runs of five and the judges ruled on a case only one side was put in.
- **The judges are methods, not people.** No prompt speaks as a named person; no
  citations, because a fabricated one attributed to a real judge is the harm. The
  disclaimer is data, attached by the runner. (0005)
- **One model for all seven calls to begin with**, then a progression toward
  several, driven by the logs and visible in the history. Graded.
- **Validation runs the schema files directly**, never restates them. (0006)
- **Runs cited by a record are copied to `docs/evidence/` by hand**, never
  reconstructed. (0007)

## How to work here

- Write the plan before the code. I read plans; it is the cheapest place to
  catch a misunderstanding. One turn does one thing — a turn touching schema,
  prompts and UI at once cannot be reviewed.
- **Commit before I invoke you, not only after**, so the diff is attributable to
  the turn. Remind me if I forget. Graded directly. Commit again at the end:
  atomic, one change per commit, message naming the intent and never
  overstating it.
- **Every turn ends with a record in `docs/turns/`**, written during the turn,
  never reconstructed. A retrofitted trail loses marks even when the build is
  sound. See `docs/turns/TEMPLATE.md`.
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
- **Never ask the model for a value the system already has.** Identity, method,
  provenance, the disclaimer — all known before the call. The model supplies
  only what only it can supply: the reasoning. The runner attaches the rest and
  the gates compare against the single source. Four failures, one cause; see
  the pitfalls.
- **Where prompt and schema describe different shapes, the schema wins and the
  prompt is decoration.** A prompt asking for ordered tests against a schema
  offering `string[]` produces bullet points. If behaviour must differ, the
  *contract* must differ, not just the instructions.
- When I correct you, ask whether the correction belongs here as a standing
  rule. A correction that lives only in the chat is gone next session.

## What good work looks like here

- A **criterion** is good when two readers could not disagree about whether it
  was met. A **specification** is good when it settles what you would otherwise
  guess at — if you are guessing, say so rather than filling the gap.
- **Documentation** says *why*. You can describe the code accurately; you cannot
  know why I chose it. Ask me.
- An **interface** is good when a stranger knows what to do next unprompted, and
  slow, failed and empty states are part of it. Only the happy path is not finished.

## Things that have gone wrong before

Grouped by lesson, not by incident, because the incidents repeat. Instances are
kept as evidence; a new one joins its group rather than starting a new line.

- **Two statements of one contract drift, silently.** `responds_to` — prompt
  demanded two answers, schema allowed one (24.08). Provenance fields — prompt
  forbade them, schema required them, all seven calls failed (24.08). `grounds`
  as `string[]` flattening three judicial methods into bullets (31.08). Assume
  it is happening again somewhere.
- **Asking the model for what we already hold.** Provenance (24.08),
  the disclaimer, returned paraphrased (31.08), `representative_id`, misspelled
  as `daenerys_targator` and `daenerys_targatorn` in two runs (31.08). Each cost
  a whole call. Fixed by attaching, not requesting.
- **Gates that could not catch, or caught the wrong thing.** A gate requiring an
  advocate to agree with its seat — the exact thing the simulation rule forbids,
  and it would have looked like diligence (24.08). G5 skipping all of `src/`,
  the only place the defect could appear (24.08). A 600-character answer cap
  discarding a whole judge opinion — a bound tight enough to reject good output
  is a bug in the bound (31.08). G3, which has never fired on real input because
  every judge cites every fact (31.08).
- **Reading configuration or files wrongly.** `config.js` read
  `TRIBUNAL_MODEL` at import time, before `.env` was loaded — imports evaluate
  first, so read config when needed, never at module scope (31.08). The `.env`
  parser split on `\n`, leaving a carriage return on every value on Windows —
  anything reading a file must assume CRLF (31.08). `npm run compare > file`
  wrote the turn 010 evidence as UTF-16 with a BOM and 124 colour escapes, which
  git would have committed as a binary blob — a step done every turn belongs in
  the tool, not in a shell whose defaults differ per machine (31.08).
- **Concluding from too little.** Called `--json-mode off` free after one clean
  run; four runs showed ~29% of calls returning prose (31.08). Counted the
  agreed facts from memory as six when there are five, and the indices are
  load-bearing (24.08).
- **Provider behaviour that is invisible without a gate.** `response_format`
  support on OpenRouter is per *endpoint*, not per model: without
  `require_parameters` a call is routed to one that ignores it, the request
  succeeds, prose comes back, and you pay (31.08).
- **Checking the documentation is not checking the deployment.** Netlify's docs
  say the function limit is 60s, not configurable. This site's function log says
  `Duration: 30000 ms`. Three time budgets were computed against 60, shipped,
  and lost whole runs to a 504 before the log was read (31.08). When a number
  decides whether the thing works, the system's own output outranks its vendor's
  page — and outranks a fetched docs page too, which is the version of "check,
  do not recall" I thought I was obeying.
- **A bound is only real if it is smaller than every limit above it — and
  bounds that run in sequence must share one budget, not hold one each.** A 90s
  per-call timeout inside the platform limit meant no call could ever fail on
  our side (31.08). Replacing it with a per-call timeout sized to half the limit
  failed the same way: two sequential stages spent it twice and neither knew
  about the other (31.08). Deadlines survive both; per-call timeouts do not.

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
- **`logs/` is gitignored, so nothing in it reaches the repo.** Remind me to copy
  a cited run into `docs/evidence/` whenever a turn record cites one, and again
  at the end of the project — `docs/PRE-SUBMISSION.md` is the checklist. (0007)

---

## Before you finish any turn

1. Check the output against the written success criteria, point by point.
   Not "does it run" — does it meet what was written.
2. Say plainly what you did not verify. An unverified claim stated confidently
   is worse than an admitted gap.
3. Write the turn record.

Do not report a task as done because it looks done to you.
