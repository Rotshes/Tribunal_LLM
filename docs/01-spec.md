# Specification — the Tribunal

Module 10, five parts: goal and reason · testable success criteria ·
architectural guidance · validation approach · known pitfalls.

Version: 1.0 · 24 August 2026
Supersedes: nothing. First full specification.

> This document is the primary artefact. The code is downstream of it. When the
> code and this file disagree, this file is what was intended and the code is
> the defect — unless a decision record says otherwise.

The case domain arrived from the instructor on 24 August 2026 in the *Tribunal
running project info package* (case design dossier, research edition). Every
`PENDING` in `docs/00-framing.md` that waited on it is now closable. See
`docs/decisions/0003-case-domain-fixed-by-instructor.md`.

---

## 1. Goal and reason

### Goal

A deployed web application that takes a **structured charge sheet**, runs
**four advocates and three judges as seven independent model calls** through
OpenRouter, and displays **three judicial opinions side by side**, each with its
own reasoning, with no combined result produced anywhere in the system.

The first case it rules on is `T-001 — The Realm v. Jon Snow`.

### Reason

The reason is not that a panel of language models produces better judgements
than one. It probably does not. The reason is that a single model answer hides
the shape of the disagreement inside it: it arrives fluent, one-sided, and with
its uncertainty invisible, and the reader cannot tell whether the case was close
or obvious.

Seven calls arranged as a panel make that shape visible. Four advocates who see
the same record and argue from different seats show which facts are actually
contested. Three judges who receive **identical** input and still rule
differently show that the divergence is attributable to judicial method, not to
different evidence. That last property is the whole design, and it is why the
judges must not see each other and must not receive different material.

The refusal to combine is what makes this worth building. A panel that resolves
to a majority answers *what is the verdict*. A panel that refuses to resolve
answers a harder question: **on what grounds do competent judges reading
identical arguments reach different conclusions.** Only the second is worth
seven model calls. See `docs/decisions/0002-verdicts-are-never-combined.md`.

### The course reason, stated honestly

This is coursework for ASE-26. What is graded is the direction of the agentic
environment, not the application. The written record in this repository is the
deliverable; the app is the occasion for producing it. That is not a reason to
build it badly — an app that does not work cannot produce an honest record of
working — but it does set priority. When effort must be spent on either the
record or the polish, it goes to the record.

---

## 2. Testable success criteria

Every criterion below has one true-or-false answer. "The Tribunal gives good
judgements" is deliberately absent: it is a hope, not a criterion.

Criteria 1–8 are carried forward from `docs/00-framing.md` §3, with item 1
revised now that the charge sheet is a typed object rather than three fields.
Criteria 9–18 are new and specific to the case domain.

### Carried forward

| # | Criterion |
|---|---|
| 1 | A stranger can open a public web address, submit a charge sheet that satisfies `schemas/charge-sheet.schema.json`, and read the opinions — without being told how. |
| 2 | The three judges' rulings appear side by side on one screen, each with its own reasoning, and no single combined verdict appears anywhere in the output. A reader can see which judges disagreed and on what grounds. |
| 3 | Every case submitted is retrievable afterwards by someone who did not submit it. |
| 4 | Every model call — including failed ones — has a database row recording model, role, tokens in, tokens out, cost, and latency. |
| 5 | A deliberation that exceeds the per-run call cap aborts and says so. |
| 6 | When a model returns a malformed or empty response, the screen says the deliberation failed. It does not display a verdict. |
| 7 | Submitting an incomplete charge sheet produces a message naming the missing field, before any model is called. |
| 8 | The OpenRouter key does not appear anywhere in the browser bundle or the repo. |

### New — the panel and the case

| # | Criterion |
|---|---|
| 9 | `cases/T-001-realm-v-jon-snow.json` validates against `schemas/charge-sheet.schema.json`. A fixture with any required field removed fails validation with that field named. |
| 10 | A charge sheet with other than exactly four representatives, or other than exactly two per seat, is rejected before any model is called. |
| 11 | A complete deliberation makes **exactly seven** model calls: four advocate calls, then three judge calls. Six or eight is a failure, not a degraded success. |
| 12 | The four advocate calls are issued concurrently. The three judge calls do not start until all four advocate results are in hand. |
| 13 | All three judges receive byte-identical input: the charge sheet and the same four advocate opinions, in the same order. No judge receives another judge's output. |
| 14 | Every advocate and judge output validates against `schemas/opinion.schema.json`. Output that does not parse is recorded as a failed call and displayed as a failure. |
| 15 | Every advocate and judge output cites the agreed facts it relies on by index. An index outside the range of the case's `agreed_facts` array fails the call. |
| 16 | Each judge output carries `ruling` ∈ `{justified, not_justified}` and at least one entry in `grounds`. |
| 17 | No object anywhere in the system — schema, database column, API response, or rendered page — holds a combined, majority, averaged, or scored result derived from the three rulings. A repository-wide check for such a field returns nothing. |
| 18 | Every judge output carries the method-model disclaimer as data, not as page decoration, and the disclaimer is displayed with the opinion. |

### Deliberately not a criterion

- **That an advocate argues for the side of its seat.** The instructor's
  simulation rule fixes the procedural role only, not the opinion or the final
  position. A gate that required a defence advocate to conclude "justified"
  would enforce exactly what the rule forbids. See
  `docs/decisions/0004-the-seat-does-not-fix-the-position.md`.
- **That the three judges disagree.** Unanimity is a legitimate outcome. A
  design that forced divergence would be manufacturing its own headline result,
  which is the same error as combining, run backwards.

---

## 3. Architectural guidance

### Shape

```
browser (React + Vite, on Netlify)
    │  charge sheet in, three opinions out
    ▼
Netlify Function  ── holds OPENROUTER_API_KEY, the prompts, the call budget
    ├──► OpenRouter  ── 4 advocate calls concurrently, then 3 judge calls concurrently
    └──► Supabase    ── charge sheets, opinions, one row per model call
```

Nothing whose correctness must hold lives in the browser. The browser renders;
it does not decide, validate for real, or hold a key.

### The seven calls

| Order | Call | Sees |
|---|---|---|
| 1–4, parallel | Jon Snow · Tyrion Lannister · Daenerys Targaryen · Grey Worm | The charge sheet only |
| 5–7, parallel, after 1–4 | Barak model · Elon model · Shamgar model | The charge sheet **and** all four advocate opinions |

**There is no rebuttal round.** Advocates do not see each other. That is partly a
budget consequence — a rebuttal round would put the count at eleven, and the
count is fixed at seven — and partly a design choice: four independent readings
of the same record show what is genuinely contested, where a rebuttal round
shows who spoke last.

**Judges never see each other.** This is the load-bearing constraint of the whole
design. Identical input into three different judicial methods is the only
arrangement in which a divergent ruling means something. If judges could read
one another, divergence would be contaminated by order and by deference, and
the output would no longer answer the question the app exists to ask.

**The three judge calls are also issued concurrently.** They are independent by
construction — each receives the same assembled input, none sees another's
ruling, none is told another exists — so sequencing them buys nothing and costs
three times the wall-clock.

*Amended 31.08.2026.* This paragraph is new. Until then the judges ran one after
another, for no reason anyone had ever stated: the independence that makes
concurrency safe is the same property the design already rested on. What forced
the question was `netlify dev`, which caps a function at 30 seconds against
production's 60 — a sequential run took about 35 and could not complete in the
browser at all. Concurrency brings it to roughly 20.

Worth recording as more than a performance note: the improvement was available
from the first working version and went unmade because nothing made the waste
visible. A constraint did not create the fix; it only revealed one that had been
sitting there.

The judges' order in the output is unchanged and remains fixed —
`barak · elon · shamgar` — so the three columns do not move between runs.

### Model allocation

A per-role model map exists from the first working version, with **all seven
entries set to the same model id**. The progression toward several models is
therefore a diff to one config object plus a decision record citing the
per-call logs — visible in the commit history, which is what the course grades.

```
MODEL_MAP = {
  advocate.jon_snow:    <MODEL_A>,
  advocate.tyrion:      <MODEL_A>,
  advocate.daenerys:    <MODEL_A>,
  advocate.grey_worm:   <MODEL_A>,
  judge.barak_model:    <MODEL_A>,
  judge.elon_model:     <MODEL_A>,
  judge.shamgar_model:  <MODEL_A>,
}
```

Do not collapse this to a single constant because the values are currently
equal. The shape of the map is the point; the equality is the starting state.

### Prompts

- One file per role in `prompts/`, at a **stable path**. A new version bumps the
  `version:` header in place rather than creating `…v2.md`, so that `git diff`
  shows what changed in a prompt. A prompt change is a behaviour change and goes
  through the same review as a code change.
- The backend computes a **SHA-256 of the prompt file** at call time and records
  it on the model-call row alongside the declared version. An opinion in the
  database can then be traced to the exact prompt text that produced it, and a
  version header that was not bumped when the text changed becomes detectable.

### Data

- `cases/*.json` — versioned fixtures in the repo. These are the evidence a
  reader can open; a case that exists only in the database is not evidence.
- `panel/judges.json` — the three judges. Constant across cases, because the
  course specification fixes the panel.
- Representatives are **per case**, because they are the parties to that case.
  The count and the seat balance are fixed; the people are not.
- Supabase tables: `charge_sheets`, `deliberations`, `opinions`, `model_calls`.
  `deliberations` has `status ∈ {complete, failed, partial}` and **no verdict
  column**. There is no field to hold a combined result, which is the cheapest
  possible enforcement of criterion 17.

### Domain independence

The case domain is now known, but the schema is not specialised to Westeros.
`accused`, `affected_party`, `act_alleged`, `agreed_facts`, `issue` are general.
Nothing in the backend or the schema names a character. Only the fixture and the
four advocate prompts do — and those are data and configuration, not code.

---

## 4. Validation approach

A gate must be able to fail. A gate that has never caught anything, and could
not, counts as no gate at all.

| Gate | Runs | Fails when | Will it actually fire? |
|---|---|---|---|
| **G1 · Charge sheet schema** | Before any model call, and in CI over `cases/*.json` | Missing or mistyped field; representatives ≠ 4; seats not 2/2; background outside word bounds | Yes — on every hand-authored case and every form submission |
| **G2 · Opinion envelope** | On each of the seven responses | Response is not valid JSON, or violates `opinion.schema.json` | Yes — fluent prose where a structured object was demanded is the single most common LLM failure in this design |
| **G3 · Fact-index bounds** | On each opinion | `relies_on_facts` contains an index outside the case's `agreed_facts` range | Yes — models invent citations. This is the hallucination detector |
| **G4 · Call budget** | Per deliberation | Attempted calls ≠ 7, or cap exceeded | Yes — on retry loops, which are exactly how this breaks |
| **G5 · No-combination static check** | CI, over the whole repo | Any schema field, DB column, or response key matching `verdict\|majority\|consensus\|aggregate\|score\|average` outside the decision records that name them | Yes — this is the requirement most likely to be reintroduced by a well-meaning UI change |
| **G6 · Disclaimer and no-sentence** | On each judge opinion | Disclaimer absent, or the object carries any sentencing field | Structural, so it fires on schema drift |
| **G7 · Log completeness** | After each deliberation | `model_calls` rows ≠ calls attempted, including failures | Yes — the failure path is where logging is forgotten |
| **G8 · Secret scan** | Pre-commit and CI | `OPENROUTER_API_KEY` or a `sk-` pattern in tracked files | Rarely, and catastrophically when it does |

### Reported, never enforced

Two properties are measured and shown, and deliberately have no gate:

- **Judicial divergence** — whether the three rulings differ, and on which
  grounds. Recorded per deliberation for the write-up. Enforcing it would
  manufacture the result.
- **Advocate position vs seat** — whether an advocate concluded against its own
  seat. Interesting, logged, never blocked. Blocking it would violate the
  instructor's simulation rule.

### Human reading

Gates do not check whether the Barak model reasons like the Barak model. That
is read by a person against the profiles in the package, recorded in the turn
record, and it is the check most likely to be quietly skipped. It is named here
so that skipping it is visible.

---

## 5. Known pitfalls

Written against Module 3's four failure modes, plus what this specific design
invites.

**Ambiguity collapse — the likeliest failure.** Seven calls to one model
produce seven texts in one voice. Four advocates become one advocate with four
names; three judicial methods become three paraphrases of the same opinion. The
design would still run, still validate, and still be worthless. Mitigations: the
method profiles are written as reasoning procedure rather than as adjectives;
each judge prompt states what its method treats as decisive and what it
distrusts; divergence is measured and reported per run so the collapse is
visible rather than assumed absent.

**Sycophancy.** Judges agreeing with the most fluent advocate, or with whichever
opinion appeared first. Mitigation: identical, fixed-order input to all three
judges makes an order effect at least detectable across runs. Not solved.

**Hallucination.** The story is famous, so models will supply remembered plot
detail beyond the agreed record — and will do it confidently. This is the most
likely source of a wrong-looking opinion. Mitigation: G3, plus prompts that fix
`agreed_facts` as the only permitted factual base and require citation by index.

**Misalignment.** The system optimising for a clean-looking screen. The clean
screen here is one verdict, which is precisely what is forbidden. Any future
change that makes the output "clearer" should be suspected first.

**Fluent failure.** Prose where a ruling was demanded. Handled by G2 — and the
handling must show a failure, never an acquittal. A blank result that reads as
an answer is the worst thing this app can produce.

**Impersonation.** The judges are real people; two are dead and one is living.
The package is explicit that the profiles adapt judicial method and neither
impersonate the judges nor predict how any real court would rule. The prompts
must therefore reason *in the method*, never speak *as the person*, and the
disclaimer travels with the opinion as data. Getting this wrong is not a bug in
the app; it is a false statement about a named person.

**Cost.** Seven calls at roughly 17k tokens per case. Cheap per run, unbounded
under a retry loop. The cap is the only thing standing between a bug and a bill.

**Operational.** Supabase pauses inactive free-tier projects. Do not discover
this the night before a demonstration.

---

## Revision log

| Version | Date | Change | What prompted it |
|---|---|---|---|
| 1.0 | 24.08.2026 | First full specification | The instructor supplied the case domain, unblocking everything that was written to survive it |
