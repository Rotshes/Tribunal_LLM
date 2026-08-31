# Turn 003 — The first real deliberation, and what it showed

Date: 31 August 2026
Branch / commit: `main`. Tree was clean at the start; turn 002's four commits
were made and pushed before this turn began.

## 1. Intent

Run the seven calls against real models for the first time, and read what comes
back. Not to get a good result — to get a **measurement**. Every number in this
repository up to now was invented by the stub, and every gate had only ever
fired on input designed to make it fire.

## 2. Specification

- One model for all seven calls, chosen for cost, supporting JSON output.
- No prompt changes. Whatever the prompts produce is the finding.
- Read the three judge opinions against the dossier profiles as a person. This
  check was named in `docs/01-spec.md` §4 as the one most likely to be skipped,
  and it was skipped in turns 001 and 002.

Model chosen: `google/gemini-3.5-flash-lite`, via `TRIBUNAL_MODEL`.

## 3. Context supplied

The repository as of turn 002, the dossier's judge profiles for the human read,
and OpenRouter's documentation on structured outputs and provider routing.

## 4. Plan

Set up the accounts, run it, read it. What actually happened was three defects
before a single token was billed, and the plan became: fix, run, fix, run, read.

## 5. Execution

Three defects fixed, then two real runs.

**Defect 1 — configuration read at import time.** `config.js` built `MODEL_MAP`
from `process.env.TRIBUNAL_MODEL` at module scope. ES module imports are
evaluated before the importing module's body, so the map was built before
`cli.js` had read `.env`. Every entry was `undefined`; all seven calls failed
with "No model mapped". `modelMap()` and `callCap()` are now functions that read
the environment when called.

**Defect 2 — the `.env` parser split on `\n`.** Notepad writes CRLF, so every
value would have carried a trailing carriage return: a model slug that is not a
slug, and an API key that returns 401. Neither error would have pointed at the
parser. Moved to `src/env.js` so it could be tested, with a test that feeds it
CRLF, comments, quotes and stray whitespace.

Both were caught before any billable call. Neither had a test; both do now, and
the model-map test fails against the previous version.

**Defect 3 — silent provider downgrade.** See §6a.

**Run A** (`c3df09ea`): 7 attempted, 6 succeeded, 1 failed, `partial`.
16,009 in / 5,704 out. 33.7s.
**Run B** (`8cf460ba`): 7 attempted, 7 succeeded, `complete`.
20,725 in / 7,004 out. 32.2s.

Files changed: `src/config.js`, `src/deliberate.js`, `src/cli.js`,
`src/env.js` (new), `src/providers/openrouter.js`, `tests/gates.test.js`
(24 → 27 tests).

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| Seven calls, four then three | Run B log | Pass — 7 rows, advocates first |
| Every call logged including failures | Run A log | Pass — 7 rows, one `succeeded: false` with the reason |
| Opinions traceable to prompt text | Log inspected | Pass — distinct `prompt_sha256` per role, `prompt_version` 1.0 |
| Failure shown as failure, not acquittal | Run A display | Pass — the failed seat showed as failed and the judges were told it argued nothing |
| No combined result | `npm run check` (G5) | Pass |
| Gates fire on real output | Run A | Pass — G2 rejected a prose response. First time a gate has caught something it was not handed |
| Judges reason by distinct methods | **Human read against the dossier profiles** | **Fail — see §6b** |

### 6a. The silent provider downgrade

In run A, `tyrion_lannister` returned prose despite `response_format:
{ type: "json_object" }`. G2 rejected it.

Cause: support for `response_format` on OpenRouter is per **endpoint**, not per
model. The same model is served by several providers and only some honour the
parameter. The call was routed to one that did not; the request succeeded, prose
came back, and the call was billed.

Fix: `provider: { require_parameters: true }`, which restricts routing to
endpoints supporting every parameter sent. Run B: seven for seven.

Worth stating plainly because the failure mode is nasty — it is intermittent,
it depends on routing rather than on anything in the code, and without G2 it
would have surfaced as an advocate that occasionally, inexplicably, said
nothing.

**A question deliberately not answered:** whether a failed call should be
retried. A retry makes eight calls, and G4 requires exactly seven. That is a
specification question, not a bug, and it is left open rather than resolved by
whichever behaviour was easiest to code.

### 6b. The finding: the judges converge, and the schema is why

This is the substance of the turn.

Across both runs, six judge opinions, all three judges ruled `not_justified`,
and all six cited **`[0, 1, 2, 3, 4]`** — every fact, every time.

Unanimity is legitimate and the specification says so. Identical citation sets
across six independent opinions are not a ruling, they are a tell: the judges
are not selecting facts, they are filling the array. Two consequences:

1. The three methods are not doing distinct work on the record.
2. **G3 cannot fire on real output.** A gate that only fires on input designed
   to make it fire is, by this project's own standard, not yet a gate.

Read against the dossier profiles, run B is better than run A but still short:

| Judge | Method visible? | What is missing |
|---|---|---|
| Barak | Partly — reaches for "rational fit" and procedural exhaustion, which are the right ideas | No defined terms, no separated questions, no ordered tests applied in sequence. The prompt asks for a structure; the output is a flat list |
| Elon | Partly — leads on competence to act | Never asks whether this is a legal question or a political one. No trace of the inherited conversation the method is built on |
| Shamgar | Most — carries fact indices inside each ground, the only judge to do so | No chronology reconstruction, which the prompt makes step one, and no map of which institution held which power |

All three produce the same four propositions in different vocabulary: no formal
authority, no imminent threat, deception and intimacy, alternatives untried.

**The likeliest cause is not the prompts. It is `opinion.schema.json`.**
`grounds: string[]` is the same container for all three judges. A method that
should yield ordered tests and a method that should yield a chronology and a
powers map are both flattened into "list some bullet points". The prompt asks
for method; the enforceable contract asks for bullets; the contract wins.

That is the **third** time in this project that a prose statement and an
enforceable one have disagreed and the enforceable one has silently won —
after `responds_to` (turn 001) and the provenance fields (turn 002). The
standing rule in `CLAUDE.md` covers the first two. This is the same failure
appearing as a design defect rather than a bug.

### 6c. What the advocates showed

Run A: three advocates succeeded and **all three argued `not_justified`** —
including Jon Snow, from the defense seat, about his own act. The judges heard
no defense at all, so their agreement meant very little.

Run B, with Tyrion restored: Tyrion argued `justified`, and all four advocates
conceded something. There was an actual case to answer.

Both runs are consistent with the simulation rule working as intended — Jon
concluding against his own seat is in character and is exactly what decision
0004 protects. But run A shows the risk that rule carries: with a model that has
a strong prior about the case, "the seat does not fix the position" can collapse
into no adversarial process whatsoever. The `seat_divergence` metric, reported
and not gated, is what made this visible. Reporting it was the right call.

### What I did not verify

- **Whether a stronger model diverges.** Only one model has been run. The
  convergence in §6b may be a property of this model, of the prompts, of the
  schema, or of the case — and nothing here separates them. That experiment is
  the whole of turn 004.
- **Cost.** Token counts are now real (about 20.7k in / 7k out per complete
  deliberation, against the ~17k total estimated in early planning — the
  estimate was low). Cost per call is not yet recorded: `usage.cost` came back
  absent and the log column holds `null`.
- **The disclaimer's contents.** See the correction below.
- **Whether run-to-run variation is large.** Two runs is not a sample.

## 7. Outcome

**Locked:** the pipeline works end to end against real models. Seven calls, four
concurrent then three, every call logged with its prompt hash, failures shown as
failures.

**Open:** the convergence. The retry-versus-G4 question. Cost per call.

**Next turn (004):** two things, in this order.

1. **Change one variable.** Re-run T-001 on a stronger model, no prompt or
   schema changes. If the three methods separate, the finding is about model
   capability and the logs from both runs are the evidence for the
   one-model-toward-several progression. If they do not, the cause is ours.
2. **Give each method its own shape.** Method-specific required fields in
   `opinion.schema.json`: `tests[]` for Barak, `chronology[]` and `powers[]` for
   Shamgar, an explicit competence question for Elon. A collapsed opinion then
   fails G2 rather than looking fine, and G3 gets something real to check.

### Corrections issued this turn

**The disclaimer must be attached, not requested.** In run A the Elon opinion
came back with the disclaimer *paraphrased* — "does not impersonate the
judgement, does not represent personal views" instead of the required text. G6
checks the field is present, not that it says what it must. A legal disclaimer a
model is free to reword is not a disclaimer.

The fix is the one already applied to provenance in turn 002: the runner
attaches the exact string and G6 compares it, rather than asking the model to
produce it. Recorded here; not yet implemented.

**A gate that cannot fire on real input is not yet a gate.** G3 has never fired
outside a test, because every judge cites every fact. This does not mean G3 is
wrong — it means the thing it guards is not yet being exercised, and the honest
status is "written, unproven", not "passing".
