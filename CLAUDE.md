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

**The case domain is not yet decided.** The instructor supplies it in a later
class. Do not invent one. Where the domain would matter, keep it configurable
and say so.

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

- (none recorded yet)

## Conventions

- Prompts live in `prompts/`, one file per role, versioned like code.
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
