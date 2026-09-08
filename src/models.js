// The model allowlist, read from panel/models.json.
//
// Nothing else may decide which models are reachable. The browser sends an id
// and the backend checks it here; a model id from a request is never passed to
// the provider without passing through `allowedIds()` first. On a public URL
// the alternative is a page that lets anyone spend the project's credit on the
// most expensive model in the catalogue, seven calls at a time.

import fs from 'node:fs';
import path from 'node:path';

let cache = null;

function file() {
  if (cache) return cache;
  cache = JSON.parse(fs.readFileSync(path.join('panel', 'models.json'), 'utf8'));
  return cache;
}

/**
 * Every model on the allowlist, whatever it was observed to do.
 *
 * This is the set the backend ACCEPTS. It stays complete on purpose: archived
 * runs reference models that no longer work, `npm run deliberate` may want one
 * deliberately, and a test asserts every entry here carries an `observed`
 * record. Removing an entry would orphan the runs that used it.
 */
export function allowedModels() {
  return file().models.map(({ id, label, price_per_m_in, note, observed }) => ({
    id,
    label,
    price_per_m_in,
    note,
    observed: observed ?? null,
  }));
}

/**
 * What the picker OFFERS: the models observed to work, and nothing else.
 *
 * Turn 013 left the broken ones in the dropdown with a label — "known to fail",
 * "unreliable" — on the reasoning that a visitor picking one would get an
 * instant, free, clearly-explained failed seat, which demonstrates the failure
 * path. Roy overruled that in turn 018, and the objection is a fair one: a menu
 * that offers options which never work is a worse interface than a shorter menu,
 * whatever the labels say.
 *
 * They are FILTERED, not deleted. `allowedModels()` above still returns them,
 * `panel/models.json` still records what each one did and when, and the backend
 * still accepts them — so a stored run that used GPT-5.6 Luna still resolves,
 * and the evidence of why it was dropped survives. Only the offer is withdrawn.
 */
export function offeredModels() {
  return allowedModels().filter((m) => String(m.observed ?? '').startsWith('works'));
}

export function allowedIds() {
  return new Set(file().models.map((m) => m.id));
}

/**
 * The picker's pre-selected entry in the browser, and nothing else. The
 * project's allocation is modelMap() in src/config.js (decision 0009); this is
 * only what the dropdowns start on.
 */
export function defaultModel() {
  return file().default;
}
