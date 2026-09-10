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
| `010-compare-three-conditions.txt` | 26 runs | flash-lite ×13, 3.7-flash ×5, mixed ×5, plus 3 json-off | Turn 010 and decision 0009 — uniform 3.7-flash never divides; the split returns with flash-lite judges |
| `010-run-e-committed-allocation.json` | `cbdf1b97` | the committed allocation, no overrides | Turn 010 §6d — 7 of 7 on real models, both models recorded per call, panel divided |
| `014-final-compare.txt` | 34 runs | every configuration, both sources merged | Turn 014 §6b — the committed allocation over 12 runs, and the four-provider panel |
| `018-first-run-seven-models.json` | `ffc49fca` | decision 0013 as first committed — nemotron on shamgar, qwen on grey_worm | Turn 019 §5 — 6 of 7, shamgar refused for answering four advocates in under twenty characters |
| `019-five-runs-seven-models.txt` | 40 runs | as above, five runs of it | Turn 019 §5 — 26% of calls failed and shamgar ruled in none of the five, which is what withdrew that allocation |
| `019-five-runs-amended.txt` | 49 runs | the amended allocation — muse-glimmer on shamgar, mercury-2.5 on grey_worm | Turn 019 §6c and decision 0013's amendment — 34 of 35 calls, three judges every run, a divided panel every run. Also the four runs killed mid-session by an exhausted OpenRouter balance, which is why `isAccountFailure` exists |
| `019-complete-run-final-allocation.json` | `372f22e2` | the amended allocation, no overrides | Turn 019 §6c — one complete deliberation on the seven models the project actually ships, 7 of 7. Every other JSON here ran an allocation that was later superseded |
| `020-permutation.txt` | 58 runs | three conditions, the judges' models permuted between their seats | Turn 020 and decision 0013's permutation section — the seats order the leans 67/18/8, and muse-glimmer overrides that ordering in 11 opinions out of 11 |
| `029-live-run-after-deploy.json` | `00ed23ed` | the final allocation, on the deployed site | Turn 029 — the first production run at the public address, 7 of 7, panel divided. Fetched from `/api/runs?id=` rather than copied from `logs/`, because this run was never on a local disk: it happened in a browser, which is the point of it |

## The compare tables are cumulative, not slices

`npm run compare` prints **every** stored deliberation, so each `*-compare` and
`*-runs` file here contains all the runs the ones before it contain. The counts
in the Config column above — 26, 34, 40, 49, 58 — are totals at the moment of
capture, not the size of the thing that turn was arguing about.

That is deliberate: a slice would need the tool to filter, and a filter is a
choice about what to leave out. What each file adds over its predecessor is
named in the Cited by column, and the tool's own per-configuration blocks are
where a reader should look rather than at the total.

It is also why the three files captured on 08–09.09 must not be regenerated to
"bring them up to date". Each is a snapshot of what was known when the argument
citing it was made; re-running the tool over all of them would produce three
identical files and destroy exactly the thing they are for. That very nearly
happened on 09.09 — two of them were overwritten with the same table and had to
be restored from git.

## Adding to this folder

Only when a turn record or decision cites the run, and the citation names the
file. A run nothing refers to does not belong here.

From turn 004 onward, copy the JSON from `logs/deliberations/<id>.json`
unmodified. Do not edit it to be tidier.

**Never produce a `.txt` here with shell redirection.** Use the tool's own
`--out`:

```
npm run compare -- --out docs/evidence/010-compare-three-conditions.txt
```

`>` was used once, in turn 010, and produced a file that was UTF-16 with a BOM
and carried 124 colour escapes — git treats UTF-16 as binary, so the evidence
for that turn's central claim would have committed as an undiffable blob that
renders as mojibake on GitHub. Nothing about the command said so; the file
existed and the exit code was zero. `--out` writes plain UTF-8 with LF, which is
what `.gitattributes` guarantees for everything else here.

A transcript pasted by hand from a terminal is still fine — that is what the
`003-*` and `004-*` files are. The rule is about redirection, which looks
automatic and is not.
