# 0010 — Reads go through the backend; RLS keeps no policies

Status: accepted
Date: 31 August 2026
Closes: definition of done item 3 (`docs/00-framing.md` §3)

## The decision

Past deliberations are retrievable through `GET /api/runs`, a Netlify function
holding the secret key. Row-level security stays **enabled with no policies on
any table**, exactly as `db/schema.sql` set it up. The browser never holds a
Supabase key of any kind.

`db/schema.sql` previously said the read-only public view "gets its own explicit
policies" when it is built. It has been built, and it does not. That comment is
updated rather than left to contradict this record.

## Why, and what it was chosen over

**An anonymous read policy on the tables, with the browser querying PostgREST
directly.** This is the ordinary Supabase pattern and it was the plan. Rejected
on two grounds.

The first is scope. A policy grants a *table*, not a projection. `deliberations`
would be readable in full, including `model_map`, `gate_problems`, `cap_error`
and `reported` — and, more to the point, including every column added to it
after the policy was written by someone not thinking about who can read them.
The function exposes what it selects, and what it selects is in the source.

The second is that it would put a key in the browser. Even a publishable key is
a credential, and decision 0002's guarantee — that nothing anywhere produces a
combined result — is enforced in code that runs on the server. A client that can
query the tables directly can compute whatever it likes from them. Keeping the
read path server-side means the non-combination rule holds for the archive on
the same terms it holds for a live run, rather than by convention.

**Not implementing item 3 at all.** It is our requirement, not the instructor's;
the running-project specification names the panel, the protocol, the charge
sheet, the cases, OpenRouter, the prompts and the model progression, none of
which need retrieval. Rejected because `docs/00-framing.md` §3 is a definition of
done, and quietly dropping the item it is least convenient to meet is how a
definition of done becomes decoration.

## What it costs

- Every read is a function invocation. At this project's volume that is free and
  irrelevant; at a real one it would be a cache decision.
- Two code paths now read the same tables — `readDeliberations()` for
  `tools/compare.js` and `readDeliberationIndex()` / `readDeliberation()` for the
  app. They can drift. They are in one file, and the app path is tested against a
  fake PostgREST.
- No offline or direct-database access for a reader. Anyone wanting the raw rows
  needs the dashboard, which is correct.

## What it buys

- The archive is public without anything about the database being public.
- The failure rebuild. A judge that failed has no row in `opinions`, so a direct
  client query returns two rulings and would render two columns as though that
  were the panel. `readDeliberation()` rebuilds failures from `model_calls` so a
  retrieved incomplete run shows its third column as a failure — the same
  guarantee a live run gets. A policy-based client could not have done this
  without reimplementing it in the browser.
- One renderer. A retrieved run reaches `renderAdvocates()` and
  `renderRulings()` in the same shape a live one does, so the archive cannot
  drift into looking like a lesser record.

## What would change this

Realtime, per-user data, or authentication — any of which makes the Supabase
client library worth its dependency, and at that point the policy question is
reopened properly rather than by default.
