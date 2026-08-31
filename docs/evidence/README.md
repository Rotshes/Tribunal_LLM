# Evidence

Runs that a turn record or a decision cites. Not every run — only the ones an
argument in this repository rests on. `logs/` stays gitignored; a repository
full of generated output stops being readable.

## What is in here, and what it is worth

Two kinds of file, and the difference matters.

**`*.txt` — terminal transcripts.** Verbatim console output, captured at the
time the run happened and pasted in. Contemporaneous, but hand-copied: they are
a record of what was seen, not a machine-written artifact.

**`*.json` — persisted deliberations.** Written by `src/persist.js` at the
moment the run completed, copied here unmodified from `logs/deliberations/`.
These carry the full opinions, the model, the json mode, the temperature and a
snapshot of the agreed facts.

## Why the early runs are transcripts and not JSON

`src/persist.js` did not exist until turn 004. Every run before 31.08.2026
wrote only `logs/model-calls.jsonl` — model, role, tokens, cost, latency and
prompt hash, but **not the opinions**. The rulings for those runs existed only
in terminal scrollback.

They have not been reconstructed into JSON files. A hand-assembled artifact
shaped like a captured one is exactly the retrofitted trail the grading rules
discard, and it would be worth less than stating the gap.

The gap is itself the reason persistence was built: turn 004 tried to compare
four runs, found the opinions were not stored anywhere, and stopped to fix that
before running anything else. See `docs/turns/004-…`.

## Index

| File | Run | Config | Cited by |
|---|---|---|---|
| `003-run-a-first-real-deliberation.txt` | `c3df09ea` | `google/gemini-3.5-flash-lite`, json object | Turn 003 §6a — G2 catching a prose response on live output |
| `003-run-b-routing-fixed.txt` | `8cf460ba` | same, after `require_parameters` | Turn 003 §6a — seven for seven, confirming the diagnosis |
| `004-run-c-no-endpoints-404.txt` | `286986f6` | `anthropic/claude-sonnet-5`, json object | Turn 004 — `require_parameters` failing free instead of billing for prose |
| `004-run-d-judges-split.txt` | `8596428b` | `google/gemini-3.5-flash-lite`, json off | Turn 004 — the 2–1 split correcting turn 003's convergence claim |
| `004-baseline-compare.txt` | 8 runs | `google/gemini-3.5-flash-lite`, json off ×3 and object ×5 | Turn 004 §6c — the baseline: 3% vs 29% failure, Barak the only judge that flips, no defense case in 3 of 5 runs |

## Adding to this folder

Only when a turn record or decision cites the run, and the citation names the
file. A run nothing refers to does not belong here.

From turn 004 onward, copy the JSON from `logs/deliberations/<id>.json`
unmodified. Do not edit it to be tidier.
