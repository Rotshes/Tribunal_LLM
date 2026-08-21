# 0002 — The three verdicts are never combined

Status: accepted — supersedes an earlier choice
Date: (fill in)

## The decision

The Tribunal reports three judges' rulings side by side. It does not produce a
majority verdict, a headline ruling, a score, a confidence figure, or any other
single value derived from the three.

## What this supersedes

An earlier decision in this project set a majority verdict as the headline with
the individual rulings shown beneath it. That is reversed. The reasoning for it
was ordinary interface reasoning — a reader wants to know the answer, and an
information hierarchy should put the most important thing first — and it was
wrong here for a reason that sits outside interface design.

## Why

The course specification for the running project is fixed and shared across the
class, and it names "the protocol that refuses to combine the verdicts" as part
of that essence. The requirement is that the protocol report the three verdicts
side by side without combining them.

The refusal is the substance of the exercise, not a display convention. A panel
that resolves to a majority answers the question "what is the verdict". A panel
that refuses to resolve answers a different and harder question: on what grounds
do competent judges reading identical arguments reach different conclusions.
Only the second is worth seven model calls. A majority verdict discards exactly
the information the architecture was built to surface, and it does so while
appearing to add clarity.

There is also a claim being avoided. A single combined verdict reads as the
system's finding. Three rulings that disagree cannot be read that way — the
disagreement itself tells the reader how much weight the output can carry.

## Consequences

- No aggregation logic anywhere: not in the backend, not in the database, not
  in the interface. There is no field to hold a combined result.
- The information hierarchy must be solved without a headline. The three
  rulings are peers, and the design has to make disagreement legible at a
  glance rather than resolving it.
- The empty and failure states get harder: if one judge of three fails, the
  screen must show two rulings and one failure, and must not present the two
  as the outcome.

## What would change this

Nothing within this course. The specification is fixed and shared, and it is
what makes the class comparable. If the constraint were ever lifted, the
argument above would still stand on its own.
