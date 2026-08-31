# Turn 001 — Case domain, five-part specification, seven prompts

Date: 24 August 2026
Branch / commit: `main`, committed at the end of this turn. Working tree was
clean at the start — the scaffold commit was the last thing in history, and
nothing was uncommitted when the turn began.

## 1. Intent

The instructor supplied the case domain on 24.08. Until that arrived, the
project could be framed but not specified: the charge sheet had no real shape to
take, and the seven prompts had no characters to be prompts *for*.

The intent of this turn was to close that gap in the direction the course
grades — **specification first, code after** — and specifically to produce the
three artifacts the running-project rules name explicitly: a charge sheet
written as a specification rather than free text, seven versioned agent prompts,
and a visible starting point for the one-model-to-several progression.

Not the intent: getting anything to run. No model was called this turn and none
was meant to be.

## 2. Specification

Fixed before the agent wrote anything, as four judgement calls:

1. **The charge sheet becomes a typed object** carrying all of the dossier's
   sections — case id, accused, affected party, act alleged, background, agreed
   facts, issue, scope, representatives, provenance — each typed and validated.
   Definition-of-done item 1 is revised accordingly and dated in the revision log.
2. **Cases are repository fixtures *and* a submit form**, validating against one
   schema. A case that lives only in the database is not evidence a reader can open.
3. **Every model call returns a structured envelope wrapping prose.** Typed
   fields make gates possible; the prose keeps the judicial voice the exercise
   is about.
4. **The judges are named with a structural disclaimer** — "the Barak model", a
   judicial-method profile — never as the person, with the disclaimer carried as
   a required data field rather than as page furniture.

Alternatives were put alongside each of these and rejected in writing; the
reasoning is in decisions 0003, 0004 and 0005 and in `docs/02-charge-sheet-spec.md`.

## 3. Context supplied

- The instructor's case design dossier (9 pages) — the canonical charge sheet,
  the four representatives with the simulation rule, the three judge profiles
  with their character signals and stated risks, and the research record.
- The existing repository: `CLAUDE.md`, `docs/00-framing.md`, decisions 0001 and
  0002, `docs/GRADING-MAP.md`, `SETUP.md`.
- The course grading rules and the module notes for 4, 6, 9, 10 and 11.

**Deliberately left out:** any external material about the source story. The
whole design rests on the agreed factual record being the only evidence, and
supplying background material would have modelled the exact failure the prompts
are written to prevent.

**Also left out:** the research sources listed in the dossier's §6 (the Hebrew
opinions). The judge profiles in the dossier are already the distilled product
of that research. Reading the opinions themselves would have risked producing
prompts that quote or paraphrase real rulings, which decision 0005 forbids.

## 4. Plan

The agent proposed: locate and read the existing repo → settle the four
judgement calls → write spec, schemas, fixture, prompts → update the context
files → record decisions → verify.

Changed before approval: the order. The agent wanted to start drafting prompts
immediately from the dossier profiles. Moved to after the four judgement calls,
because the output contract the prompts must state is downstream of judgement
call 3, and prompts written first would have had to be rewritten.

Also changed: the agent's initial framing assumed the scaffold zip had been
committed as a binary blob and needed unpacking. That was wrong — the repo
already held real tracked files. Task dropped after checking rather than after
acting on the assumption.

## 5. Execution

New:

- `docs/01-spec.md` — the Module 10 five-part specification, v1.0.
- `docs/02-charge-sheet-spec.md` — field-by-field meaning and validity.
- `schemas/charge-sheet.schema.json`, `schemas/opinion.schema.json`.
- `cases/T-001-realm-v-jon-snow.json`, `cases/README.md`.
- `panel/judges.json`.
- `prompts/` — seven prompt files at v1.0, plus a rewritten `prompts/README.md`.
- `docs/decisions/0003`, `0004`, `0005`.

Modified: `CLAUDE.md` (case domain now fixed; three new standing rules; first two
pitfalls entries), `README.md` (contents table, honest status), `docs/00-framing.md`
(gap closed, §1 narrowed, DoD item 1 revised, revision log), `docs/GRADING-MAP.md`
(statuses moved off OPEN where evidence now exists).

Not in the plan, done anyway: `cases/README.md` and `panel/judges.json`. The
first because the `agreed_facts` index-stability rule needed somewhere to live
that a person adding a case would actually read; the second because judges are
constant across cases and putting them in the fixture would have duplicated them
into every future case.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| Fixture matches the dossier exactly | Field-by-field read against the PDF: act alleged, background (3 paragraphs), 5 agreed facts, issue, scope note, 4 representative briefs | Pass — verbatim |
| Agreed-fact count correct | Counted in the source | **Caught an error.** Had been recorded as six; it is five. Corrected before the fixture was written; logged in `CLAUDE.md` pitfalls |
| Fixture validates against its schema | `ajv` over `cases/*.json` | Pass, first run |
| Schema rejects what it should | Negative tests: `issue` removed; `combines_opinions: true`; 5 representatives | Pass — all three rejected, each naming the field |
| Opinion schema rejects what it should | 10 negative cases run against sample opinions | Pass — see §6a |
| Background within word bounds | Word count | Pass — 258 words, target 200–300 |
| Exactly 4 representatives, 2 per seat | Counted | Pass |
| Both schemas are valid JSON Schema | `ajv compile` | Pass |
| No prompt instructs a conclusion | Read all seven for any instruction to argue for a side or reach a ruling | Pass — each states the simulation rule explicitly |
| No prompt instructs impersonation | Read all seven judge prompts | Pass — each opens by denying personhood; each forbids citations |
| No combination anywhere | Searched all new files for aggregation fields | Pass — the nine forbidden field names appear only in the schema clause that rejects them and in the decisions that name them |
| `CLAUDE.md` under 200 lines | `wc -l` | Pass — 161 |

### 6a. What the checks actually caught

The charge-sheet fixture passed on the first run, and so did the negative tests.
Worth saying plainly rather than dressing up: nothing was wrong there.

The opinion schema was exercised with fourteen sample objects — four that should
pass, ten that should fail. All ten were rejected: a judge object carrying
`verdict`, `sentence`, `confidence` or `agrees_with`; a ruling outside the enum;
zero grounds; an empty `responds_to`; a missing disclaimer; an empty
`relies_on_facts` with no stated reason; and a plain-prose response, which is the
failure this design will actually meet most often. The four that should pass did,
including a defense advocate concluding `not_justified` — the case decision 0004
exists to protect.

**One real defect surfaced.** The judge prompts instruct the model to answer *at
least two* advocates; the schema's `responds_to` had `minItems: 1`. The prompt
and the enforceable contract disagreed, and the prompt was the more demanding of
the two, so the gate would have passed opinions the specification treats as
inadequate. Fixed by raising the schema to `minItems: 2` and noting that the
further requirement — at least one of the two from the seat ruled against —
depends on the case and cannot be expressed in JSON Schema, so it is now named
as G2b, in code, in turn 002.

That is the useful finding of the turn: writing the prompt and the schema as
separate artifacts made a disagreement between them visible. Had the contract
lived only in the prompt, nothing would have been checkable.

### 6b. What was deliberately not committed

Validation was run in a scratch environment using `ajv`. **The validator itself
is not in this commit**, because adding a dependency is on the stop-and-ask list
in `CLAUDE.md` and that decision has not been taken. G1 is therefore still
specified rather than implemented, and this turn's schema results are a check
that was performed, not a gate the repository can re-run. Making it re-runnable
is the first item of turn 002.

### What I did not verify

- **That the prompts produce the intended behaviour.** No model has been called.
  Everything above checks that the prompts say what was intended, not that they
  work. The three judge prompts could still collapse into one voice — the
  likeliest failure in this design — and nothing here would have detected it.
- **That the eight specified gates catch what they claim to.** All eight are
  specified; none is implemented in the repository. The schema checks above were
  run outside it — see §6b.
- **That the Barak / Elon / Shamgar prompts reason like those methods.** That is
  a human reading against the dossier profiles and it has not been done. Named
  in the spec as the check most likely to be quietly skipped, and it is at
  present being skipped.
- **Cost and token estimates.** The ~17k tokens per case figure is carried over
  from earlier planning and has not been measured.

## 7. Outcome

**Locked:** the case domain as data; the charge sheet as a specification; the
seven prompts at v1.0; the non-combination rule now enforced by the *shape* of
the opinion schema rather than only by a decision record; the seat-does-not-fix-
position rule; the judges-are-methods rule.

**Still open:** all of it running. No OpenRouter call, no Supabase table, no
Netlify function, no interface. The five accounts in `SETUP.md` are still the
blocking prerequisite for turn 002.

**Next turn should take up:** first, a decision on the validation dependency
(`ajv` or hand-written), so that G1 becomes something the repository can run
rather than something a session once ran. Then the thinnest executable path — load
`T-001`, run G1 over it, make the four advocate calls, then the three judge
calls, validate each response, log every call including failures, and print the
three opinions side by side to a terminal. No interface. The point of turn 002
is to make the gates fire.

### Correction issued this turn

Two, both now written down rather than left in the session:

1. **The seat-agreement gate.** The agent moved toward a validation rule
   requiring each advocate's conclusion to match its seat. That enforces the
   opposite of the instructor's simulation rule while looking like verification.
   Became decision 0004, and a standing rule in `CLAUDE.md`: *before writing a
   gate, say out loud what it would forbid, and check that the specification
   actually forbids it.*
2. **Counting from memory.** Six agreed facts asserted where there are five.
   Became a pitfalls entry: the indices are load-bearing, so count the record
   rather than recalling it.

A correction that lives only in the chat is a correction that will be needed
again.
