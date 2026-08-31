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

// The last-resort handler.
//
// Everything below returns a considered status with a message in the app's own
// words — 400, 404, 405, 422, 503. Anything that ESCAPES gets replaced by the
// platform with `{"errorType":"Error","errorMessage":"An unknown error has
// occurred"}` and a 502, which tells the reader nothing and tells us nothing.
//
// That happened on the deployed site (turn 012 §6b): `await deliberate(...)`
// had no catch around it, so a throw anywhere inside seven model calls, six
// gates, the render or the database write surfaced as three identical words.
// The project's own rule is that a failure is shown as a failure — a failure
// the app declines to describe does not meet it.
//
// This wrapper exists so the function always answers for itself. It is not a
// place to recover: it reports and gets out of the way.
export default async function handler(req) {
  try {
    return await runDeliberation(req);
  } catch (err) {
    // A COST OF GOING BACKGROUND, stated rather than hidden: nobody reads this
    // response. A background invocation answers 202 before any of this runs, so
    // the status and body below reach no browser and no log line the page can
    // show. The function log is the only channel left, which is why the error
    // is printed as well as returned.
    //
    // What the visitor sees instead is the page's poll timing out with a
    // message saying no result was recorded. That is worse than turn 012's
    // last-resort handler was for a synchronous function, and it is the price
    // of not being cut off at 30 seconds. Recorded in turn 013 §6b.
    console.error('[deliberate] unhandled failure:', err?.stack ?? err);
    return json(500, {
      error: 'The tribunal failed unexpectedly.',
      detail: err?.message ?? String(err),
      where: String(err?.stack ?? '').split('\n')[1]?.trim() ?? null,
    });
  }
}

async function runDeliberation(req) {
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
    console.error('[deliberate] charge sheet rejected:', problems);
    return json(422, {
      error: 'The charge sheet was rejected before any model was called.',
      problems,
      spent: 'nothing',
    });
  }

  // No time budget any more, and that is the point of this turn.
  //
  // This is a BACKGROUND function (see `config` at the foot of the file), so it
  // has 15 minutes rather than the 30 seconds a synchronous one gets on this
  // site. Turn 012 spent three deploys fitting seven model calls into 30
  // seconds and the last one still cut a judge off after 7 — the panel was
  // being shaped by the platform rather than by the case.
  //
  // The per-call timeout stays, generously, because a call that hangs forever
  // is still a bug: it would hold a background invocation open for a quarter of
  // an hour and produce nothing.
  const CALL_TIMEOUT_MS = 120_000;

  let provider;
  try {
    provider = makeOpenRouterProvider({ jsonMode: 'object', timeoutMs: CALL_TIMEOUT_MS });
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
    // The browser generated this and is already polling for it.
    deliberationId: body.deliberation_id ?? null,
  });

  if (result.failed_gate === 'G0') {
    console.error('[deliberate] model selection refused:', result.problems);
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
    // Non-null only for a uniform control run; model_map is authoritative.
    model: process.env.TRIBUNAL_UNIFORM_MODEL || null,
    model_map: result.model_map ?? null,
    temperature: 0.7,
    gate_problems: result.gate_problems ?? [],
    cap_error: result.cap_error ?? null,
    reported: result.reported ?? null,
    usage: result.log.summary({ wall_ms: result.wall_ms ?? null }),
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

export const config = {
  path: '/api/deliberate',
  // 15 minutes instead of 30 seconds. The caller receives 202 and an empty
  // body immediately; the result reaches the page through the archive
  // (`GET /api/runs?id=`), which turn 011 built for a different reason and
  // which turns out to be exactly the polling endpoint this needs.
  background: true,
};
