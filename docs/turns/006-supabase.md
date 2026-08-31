# Turn 006 — Supabase

Date: 31 August 2026
Branch / commit: `main`, clean at the start.

**One thing.** Deliberately, after turn 004 did eight.

## 1. Intent

Move the run record from files to a database, so that a deliberation exists
somewhere a web app can read it. The definition of done requires that "every
case submitted is retrievable afterwards by someone who did not submit it", and
a JSON file on my laptop satisfies nobody.

## 2. Specification

- Four tables matching the field names already used by `src/log.js` and
  `src/persist.js`. Those wrote to files first specifically so this would be a
  change of destination, not of shape.
- **No column able to hold a combined result**, anywhere.
- **No constraint tying `position` to `seat`.**
- The file sink stays, writes first, and is unaffected by a database failure.
- Nothing new in `package.json`.

## 3. Context supplied

`db`-shaped requirements from `docs/01-spec.md` §3, the two schema files,
`src/persist.js`, decisions 0001, 0002 and 0004, and Supabase's current
documentation on API keys — the legacy JWT pair is deprecated by end of 2026, so
the secret key is `sb_secret_…` from the API Keys tab.

## 4. Plan

Schema, sink, wire into the CLI, test against a fake fetch. Approved unchanged.

## 5. Execution

New: `db/schema.sql`, `src/sinks/supabase.js`.
Modified: `src/persist.js` (returns `{ file, doc }` and includes the call rows),
`src/cli.js`, `tests/gates.test.js` (35 → 37), `.env.example`.

**No new dependency.** The sink talks to PostgREST over `fetch` rather than
using `@supabase/supabase-js`. Adding a dependency is on the stop-and-ask list,
everything needed here is four POSTs, and the client library would be extra
weight in a Netlify function bundle later. If realtime or auth is ever wanted,
the library becomes worth asking for.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| Four tables created | Ran `db/schema.sql` in the SQL editor; Table Editor | Pass |
| A real run reaches the database | Live run, `google/gemini-3.5-flash-lite`, `--json-mode object` | Pass — `written to Supabase: 7 opinions, 7 calls` |
| Tables are written in dependency order | Test with a fake `fetch` capturing every request | Pass — charge_sheets, deliberations, opinions, model_calls |
| Nothing combined is sent | Same test greps the request bodies for the forbidden names | Pass |
| `case_for_seat` reaches the database | Same test | Pass |
| The sink refuses to run unconfigured, naming the right key | Test | Pass — the message says `sb_secret_`, not `service_role` |
| A database failure does not lose a run | Read the code path: the file is written before the sink is called, and the catch names the local file | Pass by inspection, not exercised |

### 6a. What the same run also confirmed

Two earlier fixes were proven on live output for the first time:

- **The disclaimer is attached, not requested.** All three judge opinions came
  back carrying the exact `panel/judges.json` text — "These profiles adapt
  interpretive method and reasoning style from published opinions" — rather than
  the paraphrase a judge produced in turn 003.
- **Turn 005 is holding.** Another 2–1 split, and Barak's opinion now runs six
  ordered grounds ending in an explicit weighing of individual cost against
  public gain, which is the purposive method actually being applied rather than
  gestured at. Elon and Shamgar carried per-ground fact indices, which only
  Shamgar did before.

### What I did not verify

- **The failure path.** No Supabase write has failed yet, so the catch block and
  its message are untested. Written, unproven.
- **Reads.** Nothing reads these tables back. `npm run compare` still reads the
  local files, and will keep doing so until something needs otherwise.
- **Row-level security.** RLS is enabled with no policies, so only the secret key
  reaches the data. That is correct for a backend-only writer and it is *not* yet
  correct for the public read the definition of done requires — the read-only
  view will need explicit policies, added deliberately.
- **The four constraints.** `charge_sheets_never_combines`, the fictional-only
  check and the two role-shape checks have not been made to fire.

## 7. Outcome

**Locked:** a deliberation is in Postgres. The shape has nowhere to record a
combined result, and no constraint requires an advocate to agree with its seat —
the second was as important to leave out as the first was to leave in, because a
check tying `position` to `seat` would enforce the opposite of decision 0004
while looking like data integrity.

**Open:** nothing reads the database. RLS has no read policy. The failure path
is untested.

**Next turn:** the app. A Netlify function wrapping `deliberate()`, and a page
that submits a charge sheet and shows three opinions side by side with its
slow, failed and empty states. That is one intent with two halves, and splitting
it would produce a turn whose output nobody can look at.
