#!/usr/bin/env node
// Try one model, once, before it goes on the allowlist.
//
//   npm run try-model -- deepseek/deepseek-v4-flash-0731
//
// WHY THIS EXISTS
//
// `panel/models.json` used to justify its entries by pointing at
// openrouter.ai/models?supported_parameters=response_format. On 31.08.2026 a
// four-provider run showed two of the five failing anyway — one with no
// routable endpoint, one returning prose — and both are on that list. Support
// is per ENDPOINT, not per model, and a model can also accept the parameter and
// ignore it. The catalogue is a claim; a call is evidence.
//
// So every entry now carries an `observed` field, and a test refuses any entry
// without one. This is how that field gets earned: one real call, one outcome,
// in the exact wording the file wants.
//
// The variable below is `outcome`, not `verdict`. G5 forbids that word as a
// field name across the whole repository and fired on the first draft of this
// file. It was about a model rather than about a case, so the gate was arguably
// over-broad — and renaming a local variable costs nothing, while an exemption
// in a gate that guards the project's central rule costs the gate.
//
// THE ALLOWLIST IS DELIBERATELY BYPASSED HERE, and that is safe for exactly one
// reason: this is a terminal tool. It is never imported by anything under
// netlify/, so no request from a browser can reach it. The allowlist exists to
// stop a visitor spending the project's credit on a model they named; it must
// not stop the maintainer evaluating a candidate. Those are different problems
// and this file is the reason they stay different.
//
// Cost: ONE call. Not seven.

import fs from 'node:fs';
import { loadEnv } from '../src/env.js';
import { makeOpenRouterProvider } from '../src/providers/openrouter.js';
import { loadPrompt, judgeUserMessage } from '../src/prompts.js';
import { g2OpinionEnvelope } from '../src/gates.js';
import { judgeMethod, judgeDisclaimer } from '../src/panel.js';

loadEnv();

const model = process.argv[2];
if (!model || model.startsWith('-')) {
  console.error('Usage: npm run try-model -- <openrouter/model-id>');
  console.error('Example: npm run try-model -- deepseek/deepseek-v4-flash-0731');
  process.exit(2);
}

const caseObj = JSON.parse(
  fs.readFileSync('cases/T-001-realm-v-jon-snow.json', 'utf8'),
);

// A judge call, not a synthetic prompt. The question is whether this model can
// do the job this project actually asks of it — one JSON object matching the
// opinion schema, with the longest prompt and the most structure of the seven
// roles. A model that passes a toy prompt and fails this one has taught nothing.
const prompt = loadPrompt('barak_model');

// The advocates are stubbed rather than run, because four more calls would be
// four more calls. The judge is asked to rule on two short arguments; the shape
// of the task is unchanged.
const stubAdvocates = ['jon_snow', 'grey_worm'].map((id) => ({
  representative_id: id,
  seat: id === 'jon_snow' ? 'defense' : 'prosecution',
  position: id === 'jon_snow' ? 'justified' : 'not_justified',
  case_for_seat:
    id === 'jon_snow'
      ? 'The killing prevented an ongoing campaign of mass slaughter against civilians who had already surrendered, and no lawful mechanism to stop it existed.'
      : 'The killing was carried out without authority against an unarmed person posing no immediate threat, with no attempt at arrest or any lesser alternative.',
  key_points: ['Necessity and the absence of alternatives are the whole question.'],
  argument: 'See the case above.',
  relies_on_facts: [0, 1, 4],
}));

const provider = makeOpenRouterProvider({ jsonMode: 'object', timeoutMs: 120_000 });

const started = Date.now();
let outcome;
let detail = '';

try {
  const res = await provider.call({
    role: 'judge',
    roleId: 'barak_model',
    model,
    system: prompt.system,
    user: judgeUserMessage(caseObj, stubAdvocates),
  });

  let parsed = null;
  try {
    parsed = JSON.parse(res.raw);
  } catch {
    outcome = 'UNRELIABLE';
    detail =
      'routed successfully and returned prose instead of JSON; G2 would reject it';
  }

  if (parsed) {
    // The runner attaches identity, method, provenance and the disclaimer — the
    // model is never asked for values the system already holds. Same here, or
    // the check would fail for a reason that has nothing to do with the model.
    const opinion = {
      ...parsed,
      case_id: caseObj.case_id,
      role: 'judge',
      judge_id: 'barak_model',
      method: judgeMethod('barak_model'),
      disclaimer: judgeDisclaimer(),
      model_id: model,
      prompt_version: prompt.version,
      prompt_sha256: prompt.sha256,
    };

    const problems = g2OpinionEnvelope(opinion, caseObj);
    if (problems.length === 0) {
      outcome = 'works';
      detail = `produced a valid judge opinion (${opinion.ruling})`;
    } else {
      outcome = 'UNRELIABLE';
      detail = clean(`returned JSON that failed the schema: ${problems[0]}`);
    }
  }
} catch (err) {
  // A 404 here is the interesting case and the reason this tool exists.
  outcome = /404/.test(err.message) ? 'FAILS' : 'UNRELIABLE';
  detail = clean(err.message);
}

/**
 * A provider's error body is not safe to paste into a committed file.
 *
 * The first version printed it raw, and on a 400 that meant the line offered
 * for panel/models.json contained the account's `user_id` — an identifier that
 * would have gone into a public repository — along with unescaped double quotes
 * that would have broken the JSON on paste. Neither is the model's fault and
 * neither belongs in a record of what the model did.
 *
 * So: drop identifiers, collapse whitespace, keep the part that says what
 * happened.
 */
function clean(message) {
  return String(message)
    .replace(/"?user_id"?\s*:\s*"[^"]*"/gi, '')
    .replace(/\b(user|org|account|request)[-_]?id\b\s*[:=]\s*\S+/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[,;]\s*}/g, '}')
    .trim()
    .slice(0, 180);
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
const today = new Date()
  .toLocaleDateString('en-GB')
  .replace(/\//g, '.');

console.log('');
console.log(`\x1b[1m${model}\x1b[0m  ·  ${secs}s  ·  one call`);
console.log('');
console.log(`  \x1b[1m${outcome}\x1b[0m — ${detail}`);
console.log('');
// JSON.stringify, not string concatenation: a provider message containing a
// double quote would otherwise produce a line that does not parse, and the
// person pasting it finds out from a syntax error rather than from here.
console.log('\x1b[2mPaste this into panel/models.json as the model\'s "observed" field:\x1b[0m');
console.log(`  "observed": ${JSON.stringify(`${outcome} — ${detail} (${today})`)}`);
console.log('');
console.log(
  '\x1b[2mOne call is one observation. A model that works once may still be\x1b[0m',
);
console.log(
  '\x1b[2mintermittent — run it again before trusting it with a seat.\x1b[0m',
);

process.exit(outcome === 'works' ? 0 : 1);
