// Light, dark, or whatever the machine says.
//
// Three states rather than two. A plain light/dark switch would have to pick a
// starting side, and either choice overrides a reader who has already told
// their operating system which they want — which is the preference this page
// has honoured since turn 017. `System` is the default and stays available, so
// the control adds an option instead of replacing one.
//
// Radio inputs rather than buttons: three mutually exclusive choices with one
// active is what a radio group is, and it arrives with keyboard handling and
// the right announcement to a screen reader already done.

import { useState } from 'react';

import { applyTheme, readTheme, THEMES } from '../theme.js';

const LABEL = { light: 'Light', dark: 'Dark', system: 'System' };

export default function ThemeToggle() {
  // Read once, from the same place the pre-paint script in index.html read it,
  // so the control opens showing what the page is actually set in.
  const [theme, setTheme] = useState(readTheme);

  function choose(next) {
    setTheme(applyTheme(next));
  }

  return (
    <fieldset className="theme">
      <legend>Paper</legend>
      {THEMES.map((t) => (
        <label key={t} data-active={theme === t ? 'yes' : 'no'}>
          <input
            type="radio"
            name="theme"
            value={t}
            checked={theme === t}
            onChange={() => choose(t)}
          />
          {LABEL[t]}
        </label>
      ))}
    </fieldset>
  );
}
