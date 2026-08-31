# 0003 — The case domain is fixed by the instructor, and the schema stays general

Status: accepted
Date: 24 August 2026

## The decision

The case domain arrived on 24 August 2026 in the instructor's case design
dossier: *The Tribunal — Jon Snow and the untimely demise of Daenerys
Targaryen*, research edition. The `BLOCKED` row in `docs/GRADING-MAP.md` and
the `PENDING` markers in `docs/00-framing.md` that waited on it are now closed.

The domain is adopted **as data**, not as code. `cases/T-001-realm-v-jon-snow.json`
and the four advocate prompts name the parties. Nothing else does — not the
schema, not the backend, not the database, not the interface.

## What the dossier fixes, and what it leaves open

Fixed, and not ours to change:

- The case, the accused, the act alleged, the agreed factual record, and the
  exact question for judgment.
- Four representatives in two seats, two per seat.
- Three judges, defined by judicial method.
- The scope: decide justified or not justified, give reasons, impose no
  sentence, combine nothing.
- The simulation rule: the seat fixes the procedural role only.

Left to us: the schema, the validation, the architecture, the output contract,
the gates, and the prompts that turn the profiles into instructions.

## Why the schema stays general

The obvious alternative was to specialise now that the domain is known — put
`realm`, `dragon`, `throne` into the model, or hard-code the four names.

Rejected. Three reasons, in ascending order of weight:

1. `T-001` is numbered as the first of several. A second case with different
   parties should require a new fixture, not a migration.
2. The dossier is described as a *research edition*. Editions change.
3. It is the correct separation regardless. Which people are before the tribunal
   is a fact about a case; that a tribunal has an accused, an act, an agreed
   record, and a question is a fact about tribunals. Encoding the first as the
   second would be a modelling error even if the domain never moved again.

## What it costs

The fixture carries more content than a hard-coded version would, and the
advocate prompts have to be rewritten for a new case rather than reused. Both
accepted: the prompts are per-representative, so a new case means new
representatives means new prompt files, which is honest rather than wasteful.

## What would change this

A second case from the instructor that the schema cannot express. That would be
evidence the generalisation was drawn in the wrong place — and it would be
answered by moving the boundary, not by abandoning it.
