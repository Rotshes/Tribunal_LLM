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
 * What the picker shows: id, label, price, and what the model has actually been
 * observed to do. Safe to send to a browser — none of it is a secret.
 *
 * `observed` travels because two of the five models on this list fail in
 * production while appearing in OpenRouter's own response_format catalogue, and
 * a visitor choosing one has no way to know that. A picker that presents a
 * broken option identically to a working one is a trap, not a choice.
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
