// Which of the two palettes the page is set in, and who decides.
//
// The stylesheet has had a dark palette since turn 017, behind
// `@media (prefers-color-scheme: dark)` — so the page already changed with the
// operating system and the reader had no say. This adds the say without taking
// away the default: SYSTEM remains what an unset preference means, so anyone
// who liked the old behaviour keeps it and nothing regresses.
//
// THE STORAGE KEY IS DECLARED HERE AND READ IN TWO PLACES.
//
// `web/index.html` carries a small inline script that stamps the attribute
// before the first paint — without it the page renders light, then flips, and
// a document styled as printed paper flashing white at a reader in a dark room
// is worse than not offering the choice. That script cannot import this module,
// because it has to run before any module loads. So the key is stated twice,
// which is the defect this project has been bitten by four times (CLAUDE.md,
// "two statements of one contract drift"). A test asserts the two agree.

export const THEME_KEY = 'tribunal-theme';
export const THEMES = ['light', 'dark', 'system'];

/**
 * What the reader has chosen, or 'system' if they have not chosen.
 *
 * Every read is wrapped: localStorage throws outright in some privacy modes
 * rather than returning null, and a page that fails to load because it could
 * not read a colour preference is a page with its priorities wrong.
 */
export function readTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return THEMES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Stamp the choice on the document, and remember it.
 *
 * 'system' REMOVES the attribute rather than setting it to anything. That is
 * what hands control back to the media query in the stylesheet: with no
 * `data-theme` present, `prefers-color-scheme` decides, which is exactly the
 * behaviour this page had before the control existed.
 */
export function applyTheme(theme) {
  const value = THEMES.includes(theme) ? theme : 'system';
  const root = document.documentElement;

  if (value === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', value);

  try {
    if (value === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, value);
  } catch {
    // A reader who cannot store the choice still gets the choice, for this
    // visit. Losing it on reload is a smaller failure than refusing to apply it.
  }
  return value;
}
