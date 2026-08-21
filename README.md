# The Tribunal

ASE-26 running project — Agentic Software Engineering, Mikael Gorsky.

A web app that takes a charge sheet, has AI advocates argue opposing sides, and
has three AI judges rule on those arguments. The three rulings are reported
side by side with their reasoning and are never combined into one — the
disagreement is the output.

## What is in here

| Path | What it holds |
|---|---|
| `CLAUDE.md` | The agent's standing brief. Read this first. |
| `SETUP.md` | The five accounts and how to set them up. |
| `docs/00-framing.md` | Module 6: problem statement, stakeholders, definition of done, out-of-scope. |
| `docs/01-spec.md` | Module 10: the five-part specification. |
| `docs/decisions/` | One file per decision that could have gone another way, with the reasoning at the moment it was made. |
| `docs/turns/` | One record per turn of work, on the seven-part frame from Module 4. |
| `prompts/` | The advocate and judge prompts. Versioned like code, because they are. |

## Reading this repo as a record

The seven-part frame from Module 4 — intent, specification, context, plan,
execution, verification, audit trail — is the shape of `docs/turns/`. Each turn
record is one spiral turn: what it was for, what was specified, what was placed
in the agent's reach, what it planned, what it did, how the result was checked,
and what that left open.

The decision records answer the question the code cannot: not what it does, but
why it is this way rather than the other way that was also considered.

## Status

Early. Case domain pending from the instructor; see the open gap noted in
`docs/00-framing.md`.

## Grading

`docs/GRADING-MAP.md` maps every requirement in the course grading rules to the
artifact that proves it. It is maintained as work lands, not at the end.
