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

function loadEnv() {
  // Deliberately tiny, rather than a dotenv dependency: one dependency was
  // decided on (ajv), and this does not need to be a second one.
  if (!fs.existsSync('.env')) return;
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

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

const providerName = flag('provider', 'stub');
let provider;
if (providerName === 'stub') {
  provider = makeStubProvider(flag('stub', 'good'));
} else if (providerName === 'openrouter') {
  const { makeOpenRouterProvider } = await import('./providers/openrouter.js');
  provider = makeOpenRouterProvider();
} else {
  console.error(`Unknown provider "${providerName}". Use stub or openrouter.`);
  process.exit(2);
}

const caseObj = findCase(caseId);
const result = await deliberate({ caseObj, provider });
const logFile = result.log.flush();

console.log(render(result, caseObj));
console.log(`\n\x1b[2mmodel calls logged to ${logFile}\x1b[0m`);

// Exit non-zero unless every one of the seven calls succeeded and every gate
// passed. A `partial` run is not a success: it means the screen is showing
// fewer than three rulings, and nothing downstream should treat that as an
// outcome just because the process exited cleanly.
const clean =
  result.status === 'complete' &&
  (result.gate_problems?.length ?? 0) === 0 &&
  !result.cap_error;
process.exit(clean ? 0 : 1);
