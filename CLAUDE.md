# The Tribunal

## Stop and ask me before you do any of these

- Change anything in `docs/00-framing.md`, `docs/01-spec.md`, or `docs/decisions/`.
  These are mine. You may draft into them when I ask; you may not revise them
  on your own initiative. (`docs/turns/` is the exception — writing the turn
  record is your job at the end of every turn.)
- Add a dependency, a service, or a new model provider.
- Change the database schema.
- Change any prompt in `prompts/`. Prompts are behaviour; a prompt edit is a code change.
- Delete or rewrite a file you did not create in this session.
- Push to `main`, deploy, or run anything that spends money outside the per-run cap.

When you hit one of these, stop and state the decision you need from me. Do not
pick the reasonable-looking option and continue.

---

## What this project is

A web app that takes a charge sheet, has several AI advocates argue opposing
sides, has three AI judges rule on those arguments, and shows the verdict with
its reasoning and its dissent.

It is coursework for ASE-26 (Agentic Software Engineering, Mikael Gorsky).
The course grades how well the agent is directed, not the app that ships.
That means the written record in this repo is the deliverable. The app is the
occasion for producing it.

**The case domain is fixed.** The instructor supplied it on 24.08.2026: case
`T-001 — The Realm v. Jon Snow`, four named representatives in two seats, three
judges defined by judicial method. It lives in `cases/` and in the advocate
prompts, **as data**. Nothing in the schema, the backend, the database, or the
interface names a character. Keep it that way — `T-001` is numbered as the first
of several. See `docs/decisions/0003-case-domain-fixed-by-the-instructor.md`.

## The build

- Browser: the charge sheet form and the opinion display.
- Backend: holds the OpenRouter key, the rubric, and the prompts. Calls the models.
- Database (Supabase/Postgres): charge sheets, opinions, and one row per model
  call recording model, verdict, tokens in, tokens out, cost, and latency.
- Deployment: Netlify.

The OpenRouter key never reaches the browser. Nothing whose correctness must
hold lives in the browser.

## Decisions already made

These are settled. Do not reopen them without asking.

- **Verdict protocol — the three verdicts are never combined.** The three
  judges' rulings are reported side by side, each with its own reasoning. There
  is no majority verdict, no headline ruling, no score, no average, no "2 of 3
  agree" summary. Any output that reduces three rulings to one is a violation
  of the fixed course specification, not a design preference. If you find
  yourself computing a single result from the three, stop.
- **Model allocation:** the same model for all seven calls to begin with, then
  a deliberate progression toward several models, driven by the logs. Cost,
  tokens, and latency are recorded per call from the first working version so
  that the move to several models rests on measurements. The progression must
  be visible in the commit history — it is graded.
- **Failure display:** a failed or malformed model response is shown as a
  failure. It is never shown as a verdict, and never silently defaulted to an
  acquittal. A blank result that reads as an answer is the worst outcome
  this app can produce.
- **The seat does not fix the position.** An advocate's seat sets its procedural
  role only. Nothing — no gate, no schema rule, no prompt line, no retry — may
  require an advocate to conclude in favour of its own seat. Divergence is
  measured and reported, never blocked.
  See `docs/decisions/0004-the-seat-does-not-fix-the-position.md`.
- **The judges are methods, not people.** No prompt tells a model to speak as a
  named person. The disclaimer is a required field on every judge opinion, not a
  page footer. No citations — the model has no library, and a fabricated citation
  attributed to a real judge is the harm being prevented.
  See `docs/decisions/0005-judges-are-method-models-not-people.md`.
- **All three judges receive identical input** and never see each other. This is
  load-bearing: identical input into three methods is the only arrangement in
  which a divergent ruling means anything.

## How to work here

- Write the plan before you write code. I read plans; that is the cheapest
  place to catch a misunderstanding.
- One turn does one thing. A turn that touches the schema, the prompts, and
  the UI at once cannot be reviewed.
- **Commit before I invoke you, not only after.** The working tree is committed
  and clean before a turn starts, so the diff a turn produced is exactly
  attributable to that turn. Remind me if I forget. This is graded directly.
- Commit again at the end of the turn. Commits are atomic — one change, one
  commit — and the message names the intent, not the diff. "Add retry on
  malformed judge output", not "update api.js". Never write a message that
  overstates what was done.
- Every turn ends with a record in `docs/turns/` before it is committed.
  See `docs/turns/TEMPLATE.md`. This is not optional paperwork — it is the
  part of the coursework being graded.
- The record is written during the turn, never reconstructed later. A trail
  assembled at the end loses marks even when the build is sound.
- A verification gate must be able to fail. A gate that has never caught
  anything, and could not, counts as no gate at all.
- **Before writing a gate, say out loud what it would forbid, and check that the
  specification actually forbids it.** A gate is a claim about what must be
  true. It can enforce the opposite of the specification while looking like
  verification, and once it is green nobody re-reads it. This rule came out of
  an actual near-miss; see decision 0004.
- **A gate that exempts the code it exists to check is decoration.** Scan
  everything; where a line legitimately trips the check, mark it with a visible
  per-line pragma and a reason. A whole file quietly excluded is a hole nobody
  can see.
- **When a rule is stated in two places, add a check that they agree — or delete
  one of the statements.** Three prompt-versus-schema disagreements in three
  turns, all silent. This is why validation runs the schema files directly
  rather than restating them in code (decision 0006).
- **Where the prompt and the schema describe different shapes, the schema wins
  and the prompt is decoration.** A prompt asking for ordered tests, against a
  schema offering `string[]`, produces bullet points. If behaviour must differ,
  the *contract* has to differ — not just the instructions.
- When I correct you, do not just fix the instance. Ask whether the correction
  belongs in this file as a standing rule. A correction that lives only in the
  chat is gone next session.

## What good work looks like here

- A success criterion is good when two people reading the result could not
  disagree about whether it was met.
- A specification is good when it settles the decisions you would otherwise
  guess at. If you find yourself guessing, that is a gap in the spec — say so
  rather than filling it.
- Documentation is good when it says why, not only what. You can read the code
  and describe it accurately; you cannot know why I chose it. Ask me for the why.
- An interface is good when a stranger knows what to do next without being told.
- Slow, failed, and empty states are part of the design, not an afterthought.
  A build that only handles the happy path is not finished.

## Things that have gone wrong before

Add to this list. One line per failure actually observed, written once, permanently.

- 24.08 — Reached for a validation gate that would have required each advocate to
  conclude in favour of its own seat. That is the exact thing the instructor's
  simulation rule forbids, and it would have sat in the suite looking like
  diligence. Caught while writing the spec, before any code. Rule added above.
- 24.08 — Miscounted the agreed factual record as six entries when it has five.
  Small, but the indices are load-bearing: opinions cite facts by index, so an
  off-by-one here corrupts every citation. Count the record, do not remember it.
- 24.08 — Prompt and schema disagreed on `responds_to` (prompt demanded two
  advocates answered, schema allowed one). Found by reading them side by side.
- 24.08 — Prompt and schema disagreed on provenance fields: the prompts forbid
  the model from emitting `model_id` / `prompt_version` / `prompt_sha256`, the
  schema required them. Every one of the seven calls failed on the first
  end-to-end run. The schema describes the *stored* opinion; the runner attaches
  provenance before validating. Second instance of the same class in two turns.
- 24.08 — The first version of G5 skipped all of `src/`, which is the only place
  a combined result could be introduced. The gate would have passed forever.
- 31.08 — `config.js` read `TRIBUNAL_MODEL` at import time. Imports evaluate
  before the importing module's body, so the map was built before `.env` was
  read and all seven calls failed. Read configuration when it is needed, never
  at module scope.
- 31.08 — The `.env` parser split on `\n`, leaving a carriage return on every
  value on Windows. Would have produced a 401 and an invalid model slug with
  nothing pointing at the parser. Anything that reads a file must assume CRLF.
- 31.08 — `response_format` support on OpenRouter is per **endpoint**, not per
  model. Without `provider: { require_parameters: true }` a call can be routed
  to an endpoint that ignores it: the request succeeds, prose comes back, and
  you pay for it. Intermittent, and invisible without G2.
- 31.08 — A judge paraphrased its own disclaimer. Anything whose exact wording
  matters must be attached by the runner and compared, never requested from the
  model. Same shape as the provenance defect on 24.08.
- 31.08 — Every judge cites every fact, in every run. G3 has therefore never
  fired on real output. Written and unproven is not the same as passing.

## Conventions

- Prompts live in `prompts/`, one file per role, versioned like code. **Paths are
  stable**: a new version bumps the `version` header in place and adds a
  changelog row, so `git diff` shows what changed in the text. Never create
  `…-v2.md`. The backend records the declared version *and* a SHA-256 of the
  file on every call row, so an edit without a version bump is detectable.
- Cases live in `cases/*.json` as repository fixtures, not only in the database.
  A case that exists only in the database is not evidence anyone can open.
- `agreed_facts` order is permanent. Opinions cite facts by index; a correction
  appends, it never rewrites or reorders.
- Secrets live in the environment, never in the repo. Check before committing.
- Every model call is logged to the database, including the ones that failed.
- Hard cap on model calls per deliberation; a run that exceeds it aborts.

---

## Before you finish any turn

1. Check the output against the written success criteria, point by point.
   Not "does it run" — does it meet what was written.
2. Say plainly what you did not verify. An unverified claim stated confidently
   is worse than an admitted gap.
3. Write the turn record.

Do not report a task as done because it looks done to you.
