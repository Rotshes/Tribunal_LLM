# Turn 016 — The rulings are the page

Date: 8 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Turn 015 moved the frontend to React and changed nothing about how it looked,
deliberately, so the port could be verified as a port. This is the redesign.

Roy's brief, asked for rather than assumed: **dramatic and courtroom-like**;
**separate the judges from the advocates** in the panel picker; and the Convene
button **big and in the middle so it is very apparent**.

## 2. Specification

- The three rulings dominate the page. Everything above them is preparation.
- The panel picker is two groups, not one list of seven.
- One unmistakable action, centred, impossible to miss.
- Nothing that reads as a score. Making the disagreement legible must not
  become a way of counting it. (0002)

## 3. Context supplied

The running app, decision 0002, decision 0009 (why the two halves of the panel
differ), and the existing components.

## 4. Plan

Rewrite the stylesheet · split `ModelPicker` · lift the button into its own
block · a per-column colour hook on the ruling · test the invariant the colour
could threaten.

## 5. Execution

**`web/src/styles.css` — rewritten.** Rules and hairlines rather than boxes and
shadows: a printed judgement, not a dashboard. Serif display type at the
masthead, section headings reduced to small letterspaced caps so they announce
rather than compete. The ruling is now the largest type on the page after the
title, over a 5px top rule.

**`ModelPicker.jsx` — two groups.** *The advocates* — four, concurrent, none
seeing the others — then *The judges* — three, different methods, identical
input. The split is not decorative: they run different models by default
(0009), and the allocation is far easier to reason about when the layout says
so instead of leaving it to be inferred from the order of seven dropdowns.

**`App.jsx` — the button.** Its own centred block, up to 760px wide, serif, and
the widest element on the screen until the rulings arrive. It changes its label
to *"The tribunal is sitting…"* while running, so the disabled state says what
is happening rather than only that it is unavailable.

**`Rulings.jsx` — `data-ruling`.** A per-column attribute so the stylesheet can
colour a ruling by which way it went.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| The app builds | `npm run build` | Pass — 691ms |
| The columns come from the fixed list, not from what returned | New test asserts `JUDGES.map(` opens before the first judge column | Pass |
| A failed judge still occupies its column | Same test greps for the failure text | Pass |
| The colour hook is per column | Test asserts both `[data-ruling=…]` rules exist and nothing aggregates | Pass |
| No combined result anywhere | `npm run check` (G5) over 100 files | Pass |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 70 tests, G5, G8, G9 |

### 6a. Colouring a ruling is one step from scoring it

The obvious way to make disagreement visible is colour, and the obvious way to
get it wrong is to let colour become arithmetic. Two greens and a red is a
tally whether or not anything counts it.

What is in the code: `data-ruling` on each column, two CSS rules keyed on its
value, and nothing that reads more than one column. There is no aggregate class,
no container that knows how many of each there are, and no styling that changes
when the three agree. A reader sees the shape because three colours are next to
each other, which is the same thing they would see reading the three words.

That is a fine line and worth saying out loud rather than trusting: **the moment
the layout treats "two of one colour" as a state, it has computed a majority in
CSS.** G5 would not catch that, because G5 looks for field names.

So the test added here guards the invariant the colour puts at risk — three
columns always, produced by iterating the fixed judge list rather than the
opinions that came back. Mapping over `judge_opinions` would render two columns
for a partial run, which looks exactly like a panel where the third judge was
simply not shown.

### 6b. The test flagged its own subject first

The first version of that test asserted the file did not contain
`(doc.judge_opinions ?? []).map(`. It failed immediately — on the legitimate
line that builds a lookup from opinion id to opinion, which is not rendering
anything.

Rewritten to check *position* rather than presence: every `className="judge"`
must appear after `JUDGES.map(` opens. Third false positive in three turns —
`(1300)` in G9, the `useState` pairs in the module scan, and now this — and the
same fix each time, which is that a check must describe the defect precisely
enough to exclude the correct code that resembles it.

### What I did not verify

- **How any of it looks.** Not one pixel of this turn has been rendered. The
  build succeeds and the tests pass, and neither of those has ever been evidence
  about a design. **Roy: this needs eyes, and I would expect at least one thing
  to be wrong.**
- **The dark palette.** Written blind, and a stray non-ASCII character was
  found in one hex value (`--accent:#D2AE६B`) that would have silently broken
  the dark-mode accent. Caught by scanning the file for non-ASCII, not by the
  build — CSS fails quietly, which is exactly why it deserved the scan.
- **The rulings at three columns on a real result.** The grid is unchanged from
  the version that worked, but the type is much larger and long grounds may sit
  differently.
- **Contrast ratios.** The two ruling colours were chosen to be distinguishable
  and to sit with the palette. Nobody has measured them, and the dark values in
  particular are a guess.

## 7. Outcome

**Locked:** the redesign, the split panel, and the button.

**Open:** everything visual, until it is looked at. The charge-sheet form and
DoD 1. The final deploy.

**Next turn:** whatever the screenshots show, then the form.

### Correction issued this turn

**A check must describe the defect precisely enough to exclude correct code
that resembles it.** Three false positives in three turns, each one costing a
round trip. The pattern in all three: I wrote the check against the *shape* of
the bug rather than against the thing that makes it a bug.
