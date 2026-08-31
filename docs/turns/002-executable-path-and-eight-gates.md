# Turn 002 — The executable path, and eight gates that fire

Date: 24 August 2026
Branch / commit: `main`. Tree was clean at the start — turn 001's nine commits
were made and pushed before this turn began, so this turn's diff is exactly
attributable to it.

## 1. Intent

Turn 001 produced a specification and seven prompts and proved nothing. Eight
gates existed as prose. The intent here was to make them **run**, and to make
them **fail on purpose**, before any real model is called.

The reason for that order is money and attribution. If the first execution of
this code is also the first call to a paid model, a failure has two possible
causes and no way to separate them. Running the whole path against a fake model
first means the first real call tests the models, not the plumbing.

Not the intent: a user interface, a database, or a single real model call.

## 2. Specification

Fixed before writing code:

- **The validator is `ajv`**, and no check restates a rule a schema already
  states. Roy's decision, on the stop-and-ask rule for dependencies. Recorded
  as `docs/decisions/0006-ajv-is-the-validator.md`.
- **A stub provider that misbehaves on purpose**, one mode per failure this
  design will actually meet — prose instead of an object, an invented fact
  citation, a forbidden field, a one-sided judge, a call that dies.
- **Terminal output only.** Three rulings as peers, no headline, no count.
- **The seven calls exactly**: four advocates concurrently, then three judges,
  each judge receiving the same string.
- **Every call logged, including failures**, with the fields the Supabase table
  will have, so moving the sink later is a change of destination not of shape.

## 3. Context supplied

`docs/01-spec.md` §3 and §4 (the architecture and the eight gates), the two
schemas, `CLAUDE.md`, decisions 0001–0005, and the seven prompt files.

**Deliberately left out:** anything about Supabase or Netlify. There is no
Supabase project yet, and writing the persistence layer against an imagined one
would produce code nobody could run — the exact retrofitting this project is
trying to avoid.

## 4. Plan

Agent proposed: config → gates → prompt loading → stub → orchestrator → render
→ CLI → tests, then run every failure mode.

Approved unchanged. One thing was added during execution rather than planned:
`tools/repo-checks.js`, because G5 and G8 are checks over the repository rather
than over a run and did not fit in `src/gates.js`.

## 5. Execution

New: `package.json` · `src/config.js` · `src/gates.js` · `src/prompts.js` ·
`src/deliberate.js` · `src/render.js` · `src/cli.js` ·
`src/providers/stub.js` · `src/providers/openrouter.js` · `src/log.js` ·
`tools/repo-checks.js` · `tests/gates.test.js` ·
`docs/decisions/0006-ajv-is-the-validator.md`.

Modified: `.gitignore` (adds `logs/`), `schemas/opinion.schema.json` (the
stored-vs-response boundary, see below), `README.md`, `docs/GRADING-MAP.md`,
`CLAUDE.md`.

Run it:

```
npm install
npm test                                        # 24 tests
npm run check                                   # G5, G8 over the repo
npm run deliberate -- T-001 --stub good         # a clean run
npm run deliberate -- T-001 --stub judgefail    # two rulings and one failure
```

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| The gates fail on real input | 24 tests, most written from the failing side | Pass — 24/24 |
| Exactly seven calls | Stub run, counted | Pass — 7 attempted, 7 logged |
| Advocates concurrent, judges after | `Promise.all` for advocates; sequential loop after | Pass |
| All three judges get identical input | The judge message is built **once** and reused; asserted equal, and asserted not to contain another judge's id or ruling | Pass |
| A failed judge is not an acquittal | `judgefail` mode | Pass — status `partial`, two rulings shown, the third displayed as a failure with an explicit line saying the other two are not the outcome |
| Failures are logged | `judgefail` mode, log inspected | Pass — 7 rows, one with `succeeded: false` and the reason |
| Prompt provenance is traceable | Log inspected | Pass — every row carries `prompt_version` and a distinct `prompt_sha256` |
| No combined result anywhere | G5 over the repo; plus a test that greps the result object | Pass |
| The exit code is honest | All seven stub modes | Pass — `good` and `unanimous` exit 0, every failure mode exits 1 |

### 6a. Three defects found, all by running it

**One: the schema and the prompts disagreed about provenance.** The first
end-to-end run failed all seven calls. The prompts tell the model not to emit
`model_id`, `prompt_version` or `prompt_sha256` — it cannot know its own prompt
hash — while the schema required them. Fixed by attaching that metadata in the
runner *before* validating, and by writing the boundary into the schema's own
description: the schema describes the **stored** opinion, not the raw response.

This is the second time in two turns that a prompt and a schema stating the same
contract have disagreed. It is now a standing rule rather than a third bug
waiting to happen.

**Two: G5 was exempting the code it exists to check.** The first version of the
no-combination scan skipped `src/` wholesale, because those files legitimately
name the forbidden fields in comments and in the rejection list. A gate that
excludes the only place the defect could be introduced is decoration. Rewritten
to scan `src/` and require a visible `g5-ok:` pragma on any line that names a
forbidden field. Re-running it immediately flagged three lines, all legitimate,
now marked. Prose files (`docs/`, `prompts/`, `README`, `CLAUDE.md`) stay
exempt: they are documents, not places a result could be computed.

**Three: an unreadable failure message.** A judge emitting `verdict` was
rejected — correctly — but the log said `must NOT be valid; must match "then"
schema`, which tells an operator nothing. The forbidden-field check now runs
*before* the schema so the message names the field. The schema still rejects it
too; the check is not a replacement for the rule, it is the readable half.

### 6b. What the failure modes actually produce

| Mode | Gate | Exit |
|---|---|---|
| `good` | — | 0 |
| `unanimous` | — (three judges agreeing is a legitimate outcome, not a fault) | 0 |
| `prose` | G2 — "response was not JSON (model returned prose)" | 1 |
| `badfact` | G3 — "cites fact 99; this case has 5 agreed facts (0-4)" | 1 |
| `verdict` | G6 — "/verdict is forbidden on a judge opinion" | 1 |
| `onesided` | G2b — "answers no advocate from the defense seat, which is the seat this ruling goes against" | 1 |
| `judgefail` | none; a provider error, shown as a failure and logged | 1 |

### What I did not verify

- **Anything against a real model.** No OpenRouter call has been made. The
  provider is written and unexercised: the request shape, the `json_object`
  response format, the error handling and the usage fields are all untested
  against the live API.
- **That the prompts produce distinct voices.** Still the likeliest failure in
  this design, and the stub cannot detect it — it fabricates the differences.
  Only a real run shows whether three judicial methods produce three opinions
  or one opinion three times.
- **Cost.** The token figures in the log are invented by the stub. The ~17k per
  case estimate remains unmeasured.
- **The `openrouter.js` timeout and abort path.** Written, never triggered.
- **Bundle size** of `ajv` inside a Netlify function. Noted in decision 0006 as
  something to measure rather than assume.

## 7. Outcome

**Locked:** the seven-call protocol as code rather than as prose; eight gates
that have now each failed at least once on purpose; a call log carrying the
prompt hash, so any opinion can be traced to the exact prompt text that made it.

**Still open:** the five accounts. No Node and no OpenRouter key on the build
machine as of this turn, which is why the stub exists and why turn 003 cannot
start until they do.

**Next turn (003) should take up:** the first real deliberation. Set
`TRIBUNAL_MODEL` and `OPENROUTER_API_KEY`, run `--provider openrouter`, and read
the three opinions as a person against the judge profiles in the dossier — the
check named in the spec as the one most likely to be skipped, and skipped in
both turns so far. Record what the gates catch on real output; that is the first
honest measurement this project will have.

### Correction issued this turn

**When a rule is stated in two places, add a check that they agree — or delete
one of the statements.** Two contract disagreements in two turns, both between a
prompt and a schema. Written into `CLAUDE.md` as a standing rule, and it is why
decision 0006 rejected hand-written validation: adding a third statement of the
same rules would have been choosing more of the defect.

**A gate that exempts the code it exists to check is decoration.** Written into
`CLAUDE.md` alongside the existing rule about saying out loud what a gate
forbids. The fix pattern — scan everything, require a visible per-line pragma
for legitimate exceptions — is the general answer, not a one-off.
