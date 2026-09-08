# Turn 017 — A printed judgement

Date: 8 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Roy looked at turn 016 and said it looked **too similar** to what it replaced,
and asked whether I had anything else in mind or thought it was enough.

He was right, and the reason is worth naming precisely: **016 changed degree,
not kind.** Same paper ground, same Newsreader serif, same grid of bordered
cards, same vertical stack of sections in the same order. I made the type bigger
and swapped shadows for rules. That is a restyle wearing a redesign's brief —
"dramatic" turned into "the existing thing, slightly louder".

Offered three directions that differ in *kind*. Roy chose **a printed
judgement**: the page should stop looking like a web application.

## 2. Specification

- No cards. Nothing has a background panel or a shadow; structure comes from
  rules, indents and running heads, as it does on paper.
- The document is citable — numbered parts, numbered submissions, a numbered
  schedule of facts, footnoted disclaimers.
- The three judges are three columns of set type divided by rules.
- Still nothing that reads as a score. (0002)

## 3. Context supplied

Turn 016's stylesheet and components, Roy's rejection of it, decision 0002, and
decision 0005 on why a judge is a method and not a person.

## 4. Plan

Rewrite the stylesheet around the document metaphor · rework the components
whose markup assumed cards · keep every guarantee the previous layout carried.

## 5. Execution

**Two-colour printing.** Black ink and one red, as legal and liturgical printing
has always used — the red is a **rubric**, for the parts that depart from the
ordinary text. Here that is exactly two things: a ruling of `not_justified`, and
a failure. Nothing else is coloured, which is what makes the colour mean
something.

**`styles.css`** — rewritten. Masthead naming the court over a double rule;
sections as `Part I / II / III` with the part number set right, in the rule;
`.case` and `.judge` and `.adv` lose their backgrounds and borders entirely.

**`Advocates.jsx`** — cards become numbered submissions: a hanging head column
carrying the roman numeral, the name and the seat, and a body column carrying
the case. The numeral is a CSS counter, so it cannot drift out of step with what
is rendered.

**`Rulings.jsx`** — grounds are numbered paragraphs, as they would be in a
judgement. The disclaimer is set as a footnote under a rule.

**`ChargeSheet.jsx`** — a preamble and a **Schedule**: cause number under the
title, the issue set off by a rule, the agreed facts as a numbered schedule.

**`Archive.jsx`** — a register of causes. Rulings there carry the rubric colour
too, so the register and the judgement agree.

**`App.jsx`** — parts numbered; the masthead names the court.

## 6. Verification

| Criterion | Method | Result |
|---|---|---|
| The app builds | `npm run build` | Pass — 636ms |
| Three columns from the fixed list, failed judge included | Turn 016's test, unchanged | Pass |
| The colour is per column and nothing aggregates | Same test | Pass |
| No stray non-ASCII in a CSS declaration | New test; verified by reintroducing turn 016's exact bug | Pass — fires on `#8C2B2२` |
| Every hex colour is a hex colour | Same test, values only | Pass |
| No combined result anywhere | `npm run check` (G5) | Pass — 101 files |
| Suite and repo checks | `npm test`, `npm run check` | Pass — 71 tests, G5, G8, G9 |

### 6a. The stray character got a test

Turn 016 shipped `--accent:#D2AE६B` — a Devanagari digit inside a hex colour. I
found it by scanning the file by hand and said so in that record, which is not a
control.

CSS fails **silently**: an invalid declaration is dropped, the variable keeps
whatever it had, and nothing reports it. The build was happy. That is the same
shape as several defects already in `CLAUDE.md` — an output that looks like an
answer — and it is mechanically checkable, so it should not depend on me
noticing.

The test checks declarations only, because comments and `content:` legitimately
carry symbols, and asserts every hex value is hex. I verified it by putting the
bug back and watching it fail.

### 6b. A fourth false positive, and the pattern is now the finding

The hex check's first draft matched `#status` and `#archive-section` — id
selectors, which begin with the same character and are not colours.

That is **four false positives in four turns**: `(1300)` in G9, the `useState`
pairs in the module scan, the lookup `.map` in the rulings test, and now id
selectors. Every one had the same cause, and it is not carelessness about
regular expressions:

> I write the check against the **shape** of the defect rather than against
> what makes it a defect.

`#` followed by hex-ish characters is the shape of a colour. Being *a value*
is what makes it one. `.map(` is the shape of rendering; producing the columns
is what makes it that. The fix each time was to add the distinguishing
condition, and each time it cost a round trip that a moment's thought would
have saved.

Promoted to `CLAUDE.md`, because four is a pattern rather than an accident.

### What I did not verify

- **How it looks. Again.** Not one pixel rendered. Two designs in a row now
  written blind, and the first was wrong in a way no test could have caught —
  which is the honest argument for looking before writing the next one.
  **Roy: a screenshot would let me judge this rather than guess at it.**
- **That removing every background reads as deliberate rather than unfinished.**
  This is the risk of the direction. On paper, white space between rules is
  obviously structure; on a screen, it can read as missing styling.
- **The rubric red against the paper, and both in dark mode.** Chosen to sit
  together, measured by nobody.
- **Long grounds in three narrow columns.** The columns are narrower than the
  old cards and the grounds are often two or three lines each.

## 7. Outcome

**Locked:** the page is set as a law report. Every guarantee the old layout
carried — three columns, fixed order, failure shown as failure, nothing
combined — is intact and still tested.

**Open:** whether it looks right. The charge-sheet form and DoD 1. The final
deploy.

**Next turn:** look at it, fix what the screenshots show, then the form.

### Correction issued this turn

**A redesign that changes degree is not a redesign.** Asked for "dramatic", I
produced the same layout with larger type and called it done. The tell was
available before Roy said anything: nothing about the *structure* of the page
had changed, only its measurements.
