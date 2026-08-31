// POST /api/deliberate — run a deliberation and return the three opinions.
//
// This is a thin wrapper. Everything it does is already in src/, tested there,
// and unchanged by being called over HTTP: the seven calls, the eight gates, the
// non-combination, the logging. If this file ever grows logic of its own, that
// logic is in the wrong place.
//
// The OpenRouter key and the Supabase secret key are read here and never leave
// the function. Nothing in web/ imports anything from src/.

import fs from 'node:fs';
import path from 'node:path';
import { deliberate } from '../../src/deliberate.js';
import { makeOpenRouterProvider } from '../../src/providers/openrouter.js';
import { g1ChargeSheet } from '../../src/gates.js';
import { supabaseConfigured, writeDeliberation } from '../../src/sinks/supabase.js';
import { allowedIds } from '../../src/models.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function loadCase(caseId) {
  // Repository fixtures are the case source. A case that exists only in the
  // database is not evidence anyone can open — and this also means the
  // function cannot be made to read an arbitrary path.
  if (!/^T-\d{3}$/.test(caseId ?? '')) return null;
  const dir = path.join(process.cwd(), 'cases');
  const file = fs.readdirSync(dir).find((f) => f.startsWith(caseId) && f.endsWith('.json'));
  return file ? JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) : null;
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Body must be JSON.' });
  }

  // A charge sheet may arrive by id (a repository fixture) or inline. Either
  // way it goes through G1 before a single model is called: an incomplete
  // charge sheet must cost nothing.
  const caseObj = body.case_id ? loadCase(body.case_id) : body.charge_sheet;
  if (!caseObj) {
    return json(404, { error: `No such case: ${body.case_id ?? '(none given)'}` });
  }

  const problems = g1ChargeSheet(caseObj);
  if (problems.length) {
    return json(422, {
      error: 'The charge sheet was rejected before any model was called.',
      problems,
      spent: 'nothing',
    });
  }

  let provider;
  try {
    provider = makeOpenRouterProvider({ jsonMode: 'object' });
  } catch (err) {
    // Missing configuration is an operator error, not a user error, and it must
    // not read as a failed deliberation.
    return json(503, { error: 'The tribunal is not configured.', detail: err.message });
  }

  // Per-role model overrides from the picker. Untrusted: deliberate() checks
  // each key is a real role and each value is on the allowlist, and refuses the
  // whole run if any is not. A model id from a request never reaches OpenRouter
  // without passing that check — otherwise a public URL is an invitation to
  // spend this project's credit on whatever the visitor names.
  const result = await deliberate({
    caseObj,
    provider,
    modelOverrides: body.models ?? {},
    allowedIds: allowedIds(),
  });

  if (result.failed_gate === 'G0') {
    return json(422, {
      error: 'That model selection was refused.',
      problems: result.problems,
      spent: 'nothing',
    });
  }

  const doc = {
    deliberation_id: result.deliberation_id,
    case_id: result.case_id,
    ran_at: new Date().toISOString(),
    status: result.status,
    provider: provider.name,
    json_mode: 'object',
    model: process.env.TRIBUNAL_MODEL ?? null,
    model_map: result.model_map ?? null,
    temperature: 0.7,
    gate_problems: result.gate_problems ?? [],
    cap_error: result.cap_error ?? null,
    reported: result.reported ?? null,
    usage: result.log.summary(),
    model_calls: result.log.rows,
    advocate_opinions: result.advocate_opinions,
    advocate_failures: result.advocate_failures ?? [],
    judge_opinions: result.judge_opinions,
    judge_failures: result.judge_failures ?? [],
    case_snapshot: {
      title: caseObj.title,
      agreed_facts: caseObj.agreed_facts,
      issue: caseObj.issue,
      representatives: caseObj.representatives.map((r) => ({ id: r.id, seat: r.seat })),
    },
  };

  if (supabaseConfigured()) {
    try {
      await writeDeliberation(doc, caseObj);
    } catch (err) {
      // The deliberation happened and was paid for. Losing it to a database
      // problem would be worse than serving it with a note.
      doc.storage_warning = `not saved: ${err.message}`;
    }
  }

  // The response carries three rulings as three peers. There is no combined
  // field here, and there is nowhere in `doc` to put one.
  return json(200, doc);
}

export const config = { path: '/api/deliberate' };
