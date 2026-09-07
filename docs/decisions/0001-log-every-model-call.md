# 0001 — Every model call is logged, failures included

Status: accepted
Date decided: 24 August 2026
**Date written: 31 August 2026** — see the note at the foot of this file.

## The decision

Every call to a model produces a row, whether it succeeded or not. The row
carries: the deliberation it belongs to, the role and role id, the model, the
prompt version and a SHA-256 of the prompt file, whether it succeeded, the
failure reason if it did not, tokens in and out, cost, and latency.

Nothing is written only on success. A run where five of seven calls failed
produces seven rows.

## Why, and what it was chosen over

**Logging only what came back.** Rejected, and it is the default a runner falls
into. The failures are the rows the project actually needed: turn 003 found a
provider routing downgrade because a failed call recorded *why* it failed; turn
004's finding that `--json-mode off` costs 29% of calls exists only because the
lost calls were counted; turn 010's model comparison rests on failure rates per
configuration. A log of successes describes a system that always works, which is
not the system.

**A single summary per deliberation.** Rejected. Seven calls with one aggregate
line cannot answer "which role failed", and the roles are not interchangeable —
a failed advocate leaves a seat unargued, a failed judge leaves a column empty.
Per call is the granularity the questions are asked at.

**Logging without the prompt hash.** Rejected once the prompts became versioned.
A `prompt_version` header can be edited without being bumped; the hash of the
file as it sits on disk cannot. Together they make an edit-without-a-bump
detectable, which is what makes "this opinion came from this text" a claim
rather than a hope. This is also why `.gitattributes` forces LF (turn 009 §6b):
a hash that differs by platform would be worthless.

## What it costs

- Duplication. `logs/model-calls.jsonl` is append-only across all runs;
  `logs/deliberations/<id>.json` repeats the same rows for one run; the
  `model_calls` table repeats them again. Each is the readable unit for a
  different question, and turn 009 showed the alternative — preferring one
  source — silently drops runs.
- Cost and latency are recorded as the provider reports them, and OpenRouter's
  `usage.cost` has not been independently checked against billing.

## What it buys

- Every claim in `docs/turns/` about failure rates, latency, tokens or model
  behaviour has rows behind it.
- G7 can assert that the number of calls attempted equals the number logged, so
  a silently swallowed call is a gate failure rather than a smaller number.

## What would change this

Nothing foreseen. If the volume ever made the append-only file unwieldy, the
answer is rotation, not selective logging.

---

**On this file's date.** The decision was made and acted on in turn 001 and has
governed every turn since; the *record* was not written until 31 August, when
`G9` found that this file and `0002` were cited eighteen times across the
repository and neither existed. Written late and labelled as such, because a
record backdated to look contemporaneous is worth less than an honest gap —
that principle is 0007's, and it applies to 0007's own siblings.
