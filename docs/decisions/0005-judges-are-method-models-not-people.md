# 0005 — The judges are method models, not people

Status: accepted
Date: 24 August 2026

## The decision

The three judges are **judicial-method profiles**. They are named in the
repository and in the interface — "the Barak model", "the Elon model", "the
Shamgar model" — and each is labelled, in the data, as a method adapted from
published work.

Three things follow, and all three are enforced rather than encouraged:

1. **No prompt instructs a model to speak as a named person.** Each judge prompt
   says: you reason by a defined method; you are not a person; you do not use a
   personal name for yourself, do not refer to your own career or past
   decisions, and do not state what any real judge or court would hold.
2. **The disclaimer is data.** It is a required field on every judge opinion,
   validated by gate G6, and rendered with the opinion. It is not a footer, not
   a page header, and not a line in the README — because those are the parts of
   a system that get lost in a redesign.
3. **No citations.** The prompts forbid case names, statutes, texts, chapters,
   and verses. The model has no library. A fabricated citation attributed to a
   real judge is the specific harm this decision exists to prevent.

## Why, and what it was chosen over

Two alternatives were considered.

**Name them plainly, put the caveat in the README.** Rejected. The opinion is
the thing that gets read, quoted, screenshotted, and separated from the
repository that explains it. A caveat that lives only in the documentation is a
caveat that is absent from every context where it matters.

**Anonymise the methods entirely** — "Judge A, purposive"; "Judge B,
traditionalist"; "Judge C, institutionalist". This is the safest option and it
was close. Rejected because the derivation is the substance: the instructor
supplied the profiles with named research sources precisely so that the three
methods would be *real* methods with real intellectual commitments, rather than
three adjectives invented to guarantee disagreement. Erasing the names would
make the panel unfalsifiable — nobody could check whether the Elon model
actually reasons the way that method reasons.

Naming with an attached, structural disclaimer keeps the derivation checkable
and keeps the claim honest.

## The line being drawn

There is a real difference between:

- *"Aharon Barak would hold that Jon Snow's act was justified"* — a false
  statement about a living person's views, and
- *"Reasoning by a purposive, rights-centered method: the act was justified,
  because…"* — a claim about a method, which is exactly what the method is for.

The first is a claim about a person. The second is a claim about an argument.
The system produces only the second, and the disclaimer field is what makes the
distinction survive contact with a reader who sees the opinion alone.

The instructor's dossier states the same limit on its title page: the profiles
adapt judicial methods; they do not impersonate the judges or predict a real
court.

## Consequences

- The judge prompts are longer than they would otherwise be. Accepted.
- The interface cannot display a bare surname as a column heading. The label is
  "The Barak model", always, including in compact views.
- If a judge opinion ever comes back containing a case citation or a
  first-person biographical claim, that is a **reportable defect**, recorded in
  the pitfalls list — not a stylistic wobble.

## What would change this

If the panel were reworked around invented methods rather than derived ones, the
naming question would disappear and the anonymised option would become correct.
The disclaimer-as-data rule would survive that change unaltered.
