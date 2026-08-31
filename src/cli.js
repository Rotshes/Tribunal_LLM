#!/usr/bin/env node
// npm run deliberate -- T-001 --provider stub --stub good
//
// Turn 002 is a terminal, not an interface. The point of this turn is to make
// the gates fire, not to look like anything.

import fs from 'node:fs';
import path from 'node:path';
import { deliberate } from './deliberate.js';
import { render } from './render.js';
import { makeStubProvider } from './providers/stub.js';
import { loadEnv } from './env.js';
import { persistDeliberation } from './persist.js';
import { supabaseConfigured, writeDeliberation } from './sinks/supabase.js';
import { ADVOCATE_ORDER, JUDGE_ORDER, configWarnings } from './config.js';
import { allowedIds } from './models.js';

function findCase(caseId) {
  const dir = 'cases';
  const file = fs
    .readdirSync(dir)
    .find((f) => f.endsWith('.json') && f.startsWith(caseId));
  if (!file) throw new Error(`No case file starting with "${caseId}" in ${dir}/`);
  return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
}

const args = process.argv.slice(2);
const caseId = args.find((a) => !a.startsWith('-')) ?? 'T-001';
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};

loadEnv();

// A retired variable still sitting in .env is not an error, but it must not be
// invisible: the run would succeed and quietly not be what the reader thinks.
for (const w of configWarnings()) console.error(`\x1b[33m${w}\x1b[0m`);

const providerName = flag('provider', 'stub');
let provider;
if (providerName === 'stub') {
  provider = makeStubProvider(flag('stub', 'good'));
} else if (providerName === 'openrouter') {
  const { makeOpenRouterProvider } = await import('./providers/openrouter.js');
  // --json-mode object (default) | off. See providers/openrouter.js.
  provider = makeOpenRouterProvider({ jsonMode: flag('json-mode', 'object') });
} else {
  console.error(`Unknown provider "${providerName}". Use stub or openrouter.`);
  process.exit(2);
}

const jsonMode = providerName === 'openrouter' ? flag('json-mode', 'object') : null;

// --advocates <model> and --judges <model>: set a model for a whole layer.
//
// The browser picker sets all seven roles individually; this is the shape an
// EXPERIMENT needs, because the question worth asking is which layer drives an
// outcome, not which of seven roles does. Turn 010 found that changing the
// model changed the rulings and removed the disagreement entirely, and uniform
// panels cannot say whether that came from the advocates or the judges.
//
// Validated against the same allowlist as the browser: nothing here bypasses
// the check just because it came from a terminal.
const modelOverrides = {};
const advocatesModel = flag('advocates', null);
const judgesModel = flag('judges', null);
if (advocatesModel) {
  for (const id of ADVOCATE_ORDER) modelOverrides[`advocate.${id}`] = advocatesModel;
}
if (judgesModel) {
  for (const id of JUDGE_ORDER) modelOverrides[`judge.${id}`] = judgesModel;
}

const caseObj = findCase(caseId);
const result = await deliberate({
  caseObj,
  provider,
  modelOverrides,
  allowedIds: allowedIds(),
});

if (result.failed_gate === 'G0') {
  console.error('\x1b[31mThat model selection was refused:\x1b[0m');
  for (const p of result.problems) console.error(`  · ${p}`);
  console.error('\x1b[2mNothing was spent. Allowed models are in panel/models.json.\x1b[0m');
  process.exit(2);
}
const logFile = result.log.flush();

// Record what was said, not only what it cost. Written even for a failed run:
// a run where all seven calls failed is exactly the one you want to re-read.
const { file: runFile, doc } = persistDeliberation(result, caseObj, {
  provider: provider.name,
  json_mode: jsonMode,
  // Non-null only for a uniform control run. With a per-role allocation there
  // is no single model for a run, and model_map is the authoritative field.
  model: process.env.TRIBUNAL_UNIFORM_MODEL || null,
  temperature: 0.7,
});

console.log(render(result, caseObj));
console.log(`\n\x1b[2mmodel calls logged to ${logFile}\x1b[0m`);
console.log(`\x1b[2mdeliberation saved to ${runFile}\x1b[0m`);

// The file is written first and always. The database is additional, and a
// database failure must not lose the run — the local copy already exists by the
// time this is attempted.
if (supabaseConfigured()) {
  try {
    const written = await writeDeliberation(doc, caseObj);
    console.log(
      `\x1b[2mwritten to Supabase: ${written.opinions} opinions, ${written.model_calls} calls\x1b[0m`,
    );
  } catch (err) {
    console.error(`\x1b[31mSupabase write failed: ${err.message}\x1b[0m`);
    console.error(`\x1b[2mThe run is not lost — it is in ${runFile}\x1b[0m`);
  }
} else {
  console.log(
    `\x1b[2mSupabase not configured; run kept locally only\x1b[0m`,
  );
}

console.log(`\x1b[2mcompare runs with: npm run compare\x1b[0m`);

// Exit non-zero unless every one of the seven calls succeeded and every gate
// passed. A `partial` run is not a success: it means the screen is showing
// fewer than three rulings, and nothing downstream should treat that as an
// outcome just because the process exited cleanly.
const clean =
  result.status === 'complete' &&
  (result.gate_problems?.length ?? 0) === 0 &&
  !result.cap_error;
process.exit(clean ? 0 : 1);
