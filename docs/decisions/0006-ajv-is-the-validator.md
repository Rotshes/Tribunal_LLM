# 0006 — ajv is the validator, and the schema is the only statement of the contract

Status: accepted
Date: 24 August 2026
Decided by: Roy, on the stop-and-ask rule in `CLAUDE.md` ("add a dependency")

## The decision

`ajv` (with `ajv-formats`) is added as the project's first runtime dependency.
Gates G1 and G2 run the JSON Schema files in `schemas/` directly. No check
restates a rule that a schema already states.

Where a rule cannot be expressed in JSON Schema, it is written in
`src/gates.js` and **the schema says so in its `description`**, naming the gate
that carries it. There are four such rules:

| Rule | Why the schema cannot hold it | Carried by |
|---|---|---|
| `background` is 200–400 *words* | JSON Schema counts characters | G1 |
| Exactly 2 defense and 2 prosecution representatives | Needs a count across items by value | G1 |
| Cited fact indices are within this case's range | The bound is a property of the case | G3 |
| A judge answered an advocate from the seat it ruled against | Needs the case's seat map | G2b |

## Why, and what it was chosen over

The alternative was hand-written checks with no dependency: plain conditionals
in JavaScript restating what the schemas already say.

Rejected because the cost is not the work, it is the **drift**. Two artifacts
stating one contract disagree eventually, and they disagree silently — the
check passes, so nobody re-reads it.

That is not a hypothesis here. It has now happened twice in two turns, both
times between a prompt and a schema stating the same contract:

1. The judge prompts require at least two advocates answered; the schema
   allowed one. Found in turn 001 by reading them side by side.
2. The prompts forbid the model from emitting `model_id`, `prompt_version` and
   `prompt_sha256`; the schema required them. Found in turn 002 the moment the
   first end-to-end run was attempted — every one of the seven calls failed.

Adding a third statement of the same rules, by hand, would have been choosing
more of exactly the defect this project keeps producing.

## What it costs

- One dependency, and the supply-chain surface that comes with any dependency.
  `ajv` is a long-established package with no runtime dependencies of its own
  beyond its own small set, and the schemas remain plain JSON Schema — if it
  were ever abandoned, the schemas are portable to any other validator.
- Bundle size in a Netlify function. Not measured yet; noted so that it is
  measured rather than assumed when the function is written.

## The boundary this decision fixes

`schemas/opinion.schema.json` describes the **stored** opinion, not the raw
model response. The runner attaches `model_id`, `prompt_version` and
`prompt_sha256` before validating, because a model cannot know the hash of its
own prompt and a model-supplied provenance field would be worth nothing.

That boundary was implicit before turn 002 and it caused the second failure
above. It is now written into the schema's own `description`, so the next
reader meets it where the confusion happens.

## What would change this

A Netlify function bundle-size problem. The answer would then be to precompile
the schemas to standalone validation code — which `ajv` supports and which
keeps the schema as the single source — not to hand-write the checks.
