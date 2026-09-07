# 0002 — The three rulings are never combined

Status: accepted
Date decided: 24 August 2026
**Date written: 31 August 2026** — see the note at the foot of this file.

## The decision

The three judges' rulings are reported side by side, each with its own
reasoning. **Nothing anywhere produces a result derived from them.** No majority,
no headline, no score, no average, no "2 of 3 agree", no margin, no winner.

This is not a display preference. It is enforced at four levels, deliberately,
because a rule kept only by intention gets broken by the first convenient
feature:

- `schemas/opinion.schema.json` forbids nine field names and has nowhere to hold
  a combined result.
- `db/schema.sql` has **no column** any such value could be written to. Its most
  important property is an absence.
- G5 (`tools/repo-checks.js`) scans the whole repository, `src/` included, for a
  combined-result field name; legitimate mentions carry a visible `g5-ok:`
  pragma with a reason.
- `src/render.js` and `web/index.html` show three peers with no headline, and a
  test greps the result object and the stored document for the forbidden words.

The one derived value permitted anywhere is **whether the three differ**, in
`tools/compare.js`. It carries no margin and answers nothing about the case; it
is a property of the panel, not a result from it. Across runs, one judge's
rulings may be tallied — that is variance in a single method over repetitions,
which is the measurement the tool exists for. Across judges, within a run, never.

## Why, and what it was chosen over

**A majority verdict.** Rejected, and it is the obvious thing to build. Three
opinions and a majority is a court; three opinions and no majority is the point
of this project. The case is one where reasonable methods disagree — the whole
apparatus of four advocates and three differently-reasoned judges exists to
*show* that disagreement, and a majority line at the top would be the only thing
anyone read. The reasoning would become decoration for a number.

**A confidence score, or "2 of 3".** Rejected for the same reason with an extra
one: it invents precision. Two judges agreeing does not make a position twice as
likely to be right, and a reader shown "67%" will treat it as though it does.

**Leaving it to the interface.** Rejected. If the only thing preventing a
combined result is that nobody has added one, it will be added — by a future
turn wanting a summary line, by a model asked to be helpful, or by an
"improvement" nobody argues with. The schema and the database make it
impossible rather than merely discouraged, and G5 makes an attempt visible in
review.

## What it costs

- The output is harder to skim. A reader has to read three opinions to know what
  happened, and some will not.
- No single value to sort, chart or report on. The comparison tool is more
  awkward than it would otherwise be, and the "do they differ" column exists
  because something had to carry that question without carrying a result.
- G5 has fired on legitimate code and on this project's own tests, and has to be
  answered by renaming or by a visible pragma rather than by weakening it. That
  friction is the price of the rule being real.

## What it buys

- The disagreement is the output, which is the thing the project has to show.
- Every claim about the panel is checkable against three intact opinions.
- The prohibition survives contact with people who did not read this file,
  because it is enforced by artifacts rather than by memory.

## What would change this

Nothing. If a combined result is ever wanted, it is a different application.

---

**On this file's date.** The rule was set in turn 002 and has governed the
schema, the database, the gates, the renderer and every turn record since; the
*record* was not written until 31 August, when `G9` found that this file and
`0001` were cited eighteen times across the repository and neither existed. That
is the most-cited rule in the project having no argument behind it for nine
turns — an omission worth stating plainly rather than hiding behind a
plausible date. Written late and labelled as such.
