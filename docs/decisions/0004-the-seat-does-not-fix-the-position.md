# 0004 — The seat fixes the procedural role, and nothing may gate on the position

Status: accepted
Date: 24 August 2026

## The decision

An advocate's seat — defense or prosecution — fixes its **procedural role only**.
It does not fix its opinion, its factual inferences, its arguments, or its final
position.

Therefore: **no validation gate, schema constraint, database check, or interface
rule may require an advocate's conclusion to agree with its seat.** An advocate
in the defense seat that concludes `not_justified` has produced a valid opinion,
not a failure.

The `position` field exists and is recorded. Divergence between `position` and
`seat` is **measured and reported**. It is never blocked.

## Why this needed a decision record

Because the opposite is the obvious engineering instinct, and it would have been
implemented without anyone noticing it was a choice.

Writing a validator for this system, the natural check to reach for is: *the
defense argued for the defense, the prosecution argued against — good, the
pipeline works.* It looks like a correctness check. It is cheap, it is
deterministic, it would pass almost always, and it would sit in the test suite
looking like diligence.

It is precisely what the instructor's simulation rule forbids: "The assigned seat
fixes only each representative's procedural role. It does not fix an opinion,
factual inference, proposed argument, or final position. Let the model reason in
character."

A gate enforcing seat-position agreement would convert a rule about *reasoning
freely* into a requirement to *reason predictably*, and would do it inside a
file called `validate`. The violation would then be invisible: nobody re-reads a
green test.

## What this rules out, concretely

- No schema constraint tying `position` to `seat`.
- No prompt instruction to "argue for your side" or "defend the accused".
- No retry when an advocate concludes against its seat. That is not a malformed
  response; it is a response.
- No interface that labels such an opinion as an error, an anomaly, or a warning.

## What it rules in

- `position` is an enum of `justified`, `not_justified`, `mixed` — three values,
  not two, because an honest advocate may land between them.
- `concedes` is a first-class field. What an advocate accepts against its own
  seat is recorded rather than being buried in prose.
- Seat-position divergence is a **reported metric** per deliberation. It belongs
  in the write-up: four advocates who never concede anything are probably one
  advocate wearing four names, which is Module 3's ambiguity collapse arriving
  quietly.

## The general lesson, which belongs in CLAUDE.md

The failure mode here is not "we wrote a bad gate". It is that **a gate can
enforce the opposite of the specification while looking like verification.** A
gate is a claim about what must be true. Before writing one, say out loud what
it would forbid — and check that the specification actually forbids it.

## What would change this

Nothing while the shared specification stands. If the instructor's simulation
rule were withdrawn, seat-position agreement would still be a poor gate: it
would pass constantly and catch nothing, which by this project's own standard is
no gate at all.
