Prompts live here, one file per role, versioned like code.

Module 9: behaviour lives in the prompts, not the code. A careless prompt edit
is a real fault. Changing a prompt is a change to what the software does — it
goes through the same review as a code change, and it belongs in a turn record.

## The seven

| File | Role | Seat / method |
|---|---|---|
| `advocate-jon-snow.md` | advocate | defense |
| `advocate-tyrion-lannister.md` | advocate | defense |
| `advocate-daenerys-targaryen.md` | advocate | prosecution |
| `advocate-grey-worm.md` | advocate | prosecution |
| `judge-barak-model.md` | judge | purposive, rights-centered, systemic |
| `judge-elon-model.md` | judge | traditionalist, source-led, competence-limiting |
| `judge-shamgar-model.md` | judge | institutional, powers-first, fact-heavy |

Four plus three is the fixed panel. Seven files, seven model calls, one
deliberation.

## Versioning

**Paths are stable.** A new version bumps the `version` field in the front
matter and adds a changelog row *in the same file*. It does not create
`…-v2.md`.

The reason is that `git diff` is the artifact. A new file for each version
shows an addition and a deletion; an edit in place shows what actually changed
in the text, which is the thing worth reviewing. Versioning like code means
letting git do the versioning.

The backend records both the declared `version` and a **SHA-256 of the file** on
every model-call row. That pairing catches the failure this convention invites:
editing the text without bumping the header. The hash changes; the version does
not; the mismatch is visible in the log.

## Why each file repeats the shared rules

The record rules, the scope rules, and the output contract appear in all seven
files rather than in one included fragment. That is duplication, and it was
chosen deliberately: a prompt is what the model actually receives, and a file
that cannot be read as the whole instruction is a file that gets reviewed
wrongly. The cost is that a change to a shared rule is a seven-file diff. That
cost is accepted; the seven-file diff is also an accurate description of what
changed in the system's behaviour.

## What every prompt must contain

- The seat or method, and the reasoning procedure that goes with it.
- The rule that the agreed facts are the only citable record, cited by index.
- The prohibition on importing remembered detail from outside the record.
- The scope: justified / not justified, no sentence, no combination.
- The exact JSON output contract.

## What no prompt may contain

- An instruction to reach a particular conclusion, or to argue only for the side
  of its seat. The instructor's simulation rule fixes the procedural role only.
  See `docs/decisions/0004-the-seat-does-not-fix-the-position.md`.
- An instruction to speak as a real named person. Judges reason *in a method*.
  See `docs/decisions/0005-judges-are-method-models-not-people.md`.
- Permission to cite a case, statute, text, chapter, or verse. There is no
  library; a fabricated citation is worse than none.
