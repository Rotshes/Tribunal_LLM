# The charge sheet, as a specification

Version: 1.0 · 24 August 2026
Machine-checkable form: `schemas/charge-sheet.schema.json`
First instance: `cases/T-001-realm-v-jon-snow.json`

The course specification requires the charge sheet to be **written precisely as
a specification, not free text**. This document says what each field means and
what makes it valid; the JSON Schema beside it is the enforceable version. The
two must agree — if they drift, the schema is the defect, because this file is
where the meaning lives.

## Why a typed object rather than three fields

`docs/00-framing.md` originally defined a charge sheet as three fields:
defendant, act, exact question. The instructor's case has more than that, and
the extra material is not decoration:

- Without the **background**, a reader who does not know the story cannot follow
  the argument, and the models fill the gap from memory — which is the
  hallucination path.
- Without an **agreed factual record**, there is nothing for the advocates to
  disagree *about*. They would each argue from a private reconstruction and the
  three judges would be ruling on different cases.
- Without the **scope note**, nothing in the data stops a judge from imposing a
  sentence or from being asked to reconcile the three opinions.

So the three fields become the spine of a typed object, and the rest of the
object exists to make the seven calls answerable rather than imaginative.

---

## Fields

### Identity

| Field | Type | Rule |
|---|---|---|
| `case_id` | string | Matches `^T-\d{3}$`. Unique. Assigned, never derived from the title. |
| `title` | string | Style: `<Party> v. <Accused>`. 3–120 chars. |
| `fictional` | boolean | Must be `true` for every case this term. Present so that a non-fictional case cannot be added without an explicit change to the field. |

### The three-field spine

| Field | Type | Rule |
|---|---|---|
| `accused` | string | The person whose act is judged. One named party. |
| `affected_party` | string | The person the act was done to. Named so the stakeholder who never uses the app appears in the data. |
| `act_alleged` | string | 20–400 chars. **One act, stated as fact, without characterisation.** "Killed X by stabbing her during a private meeting" is an act. "Brutally murdered X" is an argument. |
| `issue` | string | 40–500 chars. The exact question put for judgment, phrased so that it can be answered `justified` or `not_justified` and no other way. It names the considerations in play and does not hint which way they cut. |

### Context

| Field | Type | Rule |
|---|---|---|
| `background` | string | 200–400 words. The instructor's stated target is 200–300. Written for a reader who does not know the story. Narrative, not argument. |
| `agreed_facts` | array of strings | 3–12 entries, each 20–500 chars. **Order is significant and stable** — opinions cite these by index, so an entry is never reordered or deleted once a case has been deliberated. A correction adds an entry; it does not rewrite one. |

An `agreed_facts` entry is a proposition **both seats accept**. If either side
would contest it, it does not belong here — that is what the advocates are for.
Entries state what happened and what was known; they do not evaluate.

### Scope

| Field | Type | Rule |
|---|---|---|
| `scope.decides` | array | Exactly `["justified", "not_justified"]`. The permitted rulings. |
| `scope.imposes_sentence` | boolean | Must be `false`. |
| `scope.combines_opinions` | boolean | Must be `false`. |
| `scope.note` | string | Human-readable restatement, carried into every prompt. |

These are constants asserted per case rather than hard-coded constants in the
backend, so that a case cannot quietly opt out of them and so that a reader of
the fixture sees the constraint without reading the source. The schema pins the
values; a case that sets `combines_opinions: true` fails G1 and never reaches a
model.

### The representatives

| Field | Type | Rule |
|---|---|---|
| `representatives` | array | **Exactly 4**, **exactly 2 per seat**. |
| `…[].name` | string | The party arguing. |
| `…[].seat` | enum | `defense` or `prosecution`. |
| `…[].brief` | string | 100–1200 chars. Manner of reasoning, values, and distortions — the material the prompt is built from. |

**The seat fixes the procedural role only.** It does not fix an opinion, a
factual inference, a proposed argument, or a final position. Nothing in the
schema, the backend, or any gate may require a representative to conclude in
favour of its own seat. See
`docs/decisions/0004-the-seat-does-not-fix-the-position.md`.

### Provenance

| Field | Type | Rule |
|---|---|---|
| `provenance.source` | string | Where the case came from. |
| `provenance.received` | date | When. |
| `provenance.disclaimer` | string | Travels with the case into every rendered page. |

---

## Validation order

G1 runs before any model call, and reports **every** violation, not the first.
A user who fixes one field at a time and resubmits pays seven model calls per
attempt if validation is lazy — so it is not lazy.

1. Schema-valid JSON.
2. `case_id` unique among stored cases.
3. `representatives` length 4; seat counts 2/2.
4. `background` word count within bounds.
5. `agreed_facts` length within bounds; no duplicates.
6. `scope` constants exactly as pinned.
7. `fictional` is `true`.

## What is deliberately absent

- **No `verdict`, `outcome`, `majority`, or `score` field**, here or anywhere
  downstream. There is no place to put a combined result. This is the cheapest
  available enforcement of the non-combination rule: not a check that catches
  it, but a shape that has nowhere to hold it.
- **No sentencing fields.** The Tribunal decides justified or not justified and
  gives reasons.
- **No character or world fields.** Nothing in the schema names Westeros. The
  domain lives in the fixture.

---

## Revision log

| Version | Date | Change |
|---|---|---|
| 1.0 | 24.08.2026 | First version, written from the instructor's case design dossier |
