# Turn 025 — The prompts say what the backend sends

Date: 9 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Every prompt file carries a `## User (assembled by the backend)` block
documenting the message the runner builds. Turn 023 added a fence around
submitted material and turn 024 added the brief, and none of the seven files
followed. Roy asked for them to be brought into line.

## 2. Specification

- All seven blocks show what `src/prompts.js` actually assembles.
- Version bumped and a changelog row added in each, per the convention: the file
  hash is recorded on every call, so an edit without a bump reads as an
  unbumped behaviour change.
- **A check that keeps them in line**, because restating them correctly once
  fixes today and nothing else.

## 3. Context supplied

The seven prompt files, `src/prompts.js`, and the prompt conventions in
`CLAUDE.md`.

## 4. Plan

Rewrite the seven blocks → bump each → write the agreement test → break it.

## 5. Execution

### The drift was older than the fence

The four advocate files were missing turn 023's fence and turn 024's brief —
one day old. The three judge files were describing something else entirely:

```
position: {{position}}
key points: {{key_points}}
concedes: {{concedes}}
```

The backend has sent `THE CASE FOR THE <SEAT> SEAT, as this advocate puts it:`
followed by `This advocate's own position:` **since turn 005**, when
`case_for_seat` was introduced. Four turns of drift nobody saw, in the three
files describing what the judges read.

Advocates 1.2 → 1.3; judges 1.1 → 1.2. Both changelog rows say **documentation
only, the System section is unchanged** — because the System section is what the
model receives, and nothing about behaviour changed in this turn.

### The check

`each prompt's documented user message matches what the backend assembles`
takes every literal line of each documented block and requires it to appear in
a message the assembler really produces. Placeholder lines are skipped: they say
what goes there, not what it says. The two fences and the standing rule are
asserted by name, since a placeholder line would otherwise hide them.

It covers all eight prompt files, including the generic advocate.

## 6. Verification

**89 tests pass. `npm run check` clean over 117 files.**

| Probe | Fired |
|---|---|
| rename a documented section header in one prompt | yes |
| stop documenting the fence in one prompt | yes |
| rename a section **in the assembler**, leaving docs behind | yes, after a fix |

**The third probe walked straight through the first version of this test**, and
that is the finding worth keeping. The check was `actual.includes(line)`, so
renaming the assembler's `SCOPE:` to `THE SCOPE:` still contained the documented
`SCOPE:` as a substring and the test passed on a message that no longer matched.

A test written to catch drift, which a drift walked through. It now compares
against the set of whole lines the backend emits.

Third time in three turns that a probe has found the test rather than the code
— the duplicate CSS token in 022, the fixture's hardcoded advocates in 024, this
one. Breaking a test on purpose keeps being worth more than reading it.

### Not verified

- **No model has seen these files since the edit.** The System sections are
  byte-identical, so behaviour should be unchanged, and "should" is doing work
  there — the next real run is the first evidence.
- The `prompt_sha256` recorded against every earlier run now differs from the
  files' current hashes. That is correct and intended — it is what the pairing
  exists to show — but it means a reader comparing an old run's hash to today's
  file will find a difference that is documentation, not behaviour. The
  changelog rows say so; nothing enforces that reading.

## 7. Outcome

Done: seven blocks rewritten, eight files consistent, versions bumped with
honest changelog rows, and a test that fails when any of them drifts again.

Open: the final deploy; a real run on a submitted case; evidence copies for
turns 019–025.
