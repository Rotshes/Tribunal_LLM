// A very small .env reader.
//
// Deliberately not a dependency: one was decided on (ajv), and this does not
// need to be a second. It is its own module so it can be tested — the first
// version of it lived in cli.js and split on "\n", which on Windows leaves a
// carriage return on the end of every value. A model slug with a trailing \r
// is not a model slug, and an API key with one is a 401. Nothing about that
// failure would have pointed at the parser.

import fs from 'node:fs';

export function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;

    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["'](.*)["']$/, '$1');

    out[key] = value;
  }
  return out;
}

/** Loads .env into process.env. Real environment variables always win. */
export function loadEnv(file = '.env') {
  if (!fs.existsSync(file)) return {};
  const parsed = parseEnv(fs.readFileSync(file, 'utf8'));
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined || process.env[k] === '') process.env[k] = v;
  }
  return parsed;
}
