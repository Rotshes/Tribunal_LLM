# Turn 022 — Light and dark

Date: 9 September 2026
Branch / commit: `main`. Netlify builds paused until the final deploy.

## 1. Intent

Roy asked for a light/dark option in the app.

## 2. Specification

- The reader chooses, and the choice survives a reload.
- **`system` remains the default**, so anyone who liked the existing behaviour —
  the page has followed the operating system since turn 017 — keeps it. The
  control adds an option rather than replacing one.
- No flash of the wrong palette on load.
- The dark palette is one palette, however many places apply it.

## 3. Context supplied

`web/src/styles.css` (which already carried a dark palette behind
`prefers-color-scheme`), `web/index.html`, `web/src/App.jsx`.

## 4. Plan

Guard the existing media query → add an attribute block → a pre-paint script →
a three-state control → tests that the two statements of the palette agree.

## 5. Execution

### Three states, not two

A plain light/dark switch has to pick a starting side, and either choice
overrides a reader who has already told their operating system which they want.
`System` is the default and stays available: choosing it **removes** the
attribute, which hands control back to the media query and restores exactly what
the page did before the control existed.

### The palette is now stated twice, on purpose

```
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ … } }
:root[data-theme="dark"]{ … }
```

Each covers a case the other cannot. Without the `:not()` guard, choosing Light
on a dark machine does nothing and the control is a lie. Without the attribute
block, choosing Dark on a light machine does nothing.

That is two statements of one contract, which is the defect group with four
entries in `CLAUDE.md`. So a test compares the two blocks token by token rather
than trusting them, and a second test asserts that **every colour token in
`:root` has a dark value** — a token added later and forgotten renders as its
light value on a dark ground, which is unreadable and invisible in review.

### Before the first paint

`web/index.html` carries a small inline script that stamps `data-theme` before
anything renders. Without it the page paints light and then flips, and a
document set as printed paper flashing white at a reader in a dark room is worse
than not offering the choice.

It cannot import `web/src/theme.js` — it has to run before any module loads — so
the storage key is a literal there and a constant here. **A third statement of a
contract**, and a test asserts the two agree. Both reads are wrapped in
`try/catch`, because `localStorage` throws outright in some privacy modes rather
than returning null, and a page must not fail to load over a colour preference.

### The control

Set as the edition line in the masthead: small caps, hairline underline on the
active option, no box. Radio inputs rather than buttons — three mutually
exclusive choices with one active is what a radio group is, and it arrives with
keyboard handling and the right screen-reader announcement already done. The
inputs are visually hidden but not hidden from assistive technology, and
`:focus-within` puts the outline on the label.

## 6. Verification

**84 tests pass. `npm run check` clean over 113 files. `npm run build` succeeds.**

Three new tests, each verified by breaking it:

| Test | Broken by | Fired |
|---|---|---|
| the two dark palettes agree | changing `--ink` in one block only | yes |
| every colour token has a dark value | adding `--newtoken` to `:root` only | yes |
| an explicit theme beats the machine | removing the `:not()` guard | yes |
| the key is the one the app writes | renaming it in `index.html` | yes |

**A probe that did not fire, and what it exposed.** The first attempt at
breaking the palette test *added* a duplicate `--paper` to the attribute block.
Nothing failed — the test builds an object from the declarations, so a later
duplicate silently overwrites an earlier one. Re-probed by changing a value
instead, which fired.

The test is right for the defect it targets (the two blocks holding different
values) and blind to a different one (a block declaring the same token twice).
Recorded rather than papered over: a duplicate declaration is legal CSS with no
effect here, and widening the test to catch it would be checking shape rather
than defect — the mistake `CLAUDE.md` names.

### Not verified

- **Nothing has been looked at in a browser.** Build and tests only. Whether
  the dark palette is actually legible — the rubric red at `#E08C80` on
  `#12100C`, the `6px 6px` Convene shadow, the hairlines at `#332D23` — is a
  question no unit test answers, and turn 017's design was judged by eye.
- The pre-paint script has not been observed preventing a flash; it is correct
  by construction and unobserved.
- `prefers-color-scheme` switching live while the page is open (a machine
  changing theme at sunset) is untested. `system` should follow it, because the
  media query is doing the work, but it has not been watched.

## 7. Outcome

Done: `web/src/theme.js`, `ThemeToggle.jsx`, the guarded media query, the
attribute block, the pre-paint script, the control styles, three tests.

Open: look at it in a browser in both palettes — this is the one change in the
project so far whose correctness is entirely a matter of how it looks.
