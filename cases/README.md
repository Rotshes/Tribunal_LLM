# Cases

One JSON file per case, validated against `schemas/charge-sheet.schema.json`.
The meaning of every field is in `docs/02-charge-sheet-spec.md`.

| File | Case | Source |
|---|---|---|
| `T-001-realm-v-jon-snow.json` | The Realm v. Jon Snow | Instructor's case design dossier, 24.08.2026 |

## Why cases live in the repository

A case that exists only in the database is not evidence anyone can open. These
files are the reviewable form: diffable, versioned, and readable without running
anything. The submit form validates against the same schema and writes to the
same shape, so a case authored in the browser is the same object as a case
authored here — it simply is not part of the record.

## The rule about `agreed_facts`

**Order is significant and permanent.** Every opinion cites facts by
zero-based index into this array. Reordering or deleting an entry silently
invalidates every opinion already stored against the case.

A correction therefore **appends**. It does not rewrite. If an entry is wrong
badly enough that appending cannot fix it, the case gets a new `case_id` and the
old one is left in place with a note.

## Adding a case

1. Copy an existing file; give it the next `case_id`.
2. Fill in every field. `fictional` stays `true`.
3. Exactly four representatives, exactly two per seat.
4. Write one prompt file per representative under `prompts/`. Representatives are
   parties to a case, so their prompts are per-case; the three judge prompts are
   shared and are not touched.
5. Run G1 over the file before committing.

## A note on T-001

The affected party, Daenerys Targaryen, also appears as a representative in the
prosecution seat. That is the instructor's design and it is deliberate: the
person killed argues the case against her killing. The schema permits it, no
validation objects, and the prompt instructs her not to remark on it. It is
recorded here because it looks like a data error on first reading and is not.
