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
    return json(500, {
      error: 'The tribunal failed unexpectedly.',
      detail: err?.message ?? String(err),
      // The first frame, which is usually the only one that identifies where.
      // Not the whole stack: this response is public.
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
    return json(422, {
      error: 'The charge sheet was rejected before any model was called.',
      problems,
      spent: 'nothing',
    });
  }

  // The time budget.
  //
  // THE LIMIT IS 30 SECONDS, MEASURED. Netlify's documentation says the
  // synchronous execution limit is 60 seconds and not configurable; this
  // deployment's own function log says `Duration: 30000 ms` and stops there.
  // The documentation is not describing this site.
  //
  // That number is the whole story of turn 012. Three budgets were computed
  // against 60 and all three shipped and failed:
  //
  //   1. 90s per call — larger than the invocation itself, so no call could
  //      ever fail on our side. 504, seven results lost.
  //   2. 24s per call, (60 − 8) ÷ 2 stages. Two independent timeouts are not a
  //      budget; they are two chances to spend the maximum. 504.
  //   3. A shrinking 45s deadline with a 20s cap. Correct shape, right
  //      arithmetic, wrong constant — 45s of model time inside a 30s limit
  //      cannot work, and the deadline could not save a run that had already
  //      been given more time than existed. 504.
  //
  // The standing rule in CLAUDE.md is to check a fact about an external service
  // rather than recall it. I did check, twice — and both times I checked the
  // documentation, which is a different thing from checking the deployment.
  // The log was the only source that could settle it and it was available all
  // along.
  //
  //   30s measured platform limit
  //  − 9s cold start, prompt hashing, four sequential Supabase inserts, response
  //  = 21s of model time for all seven calls, together
  //   10s cap on any single call, so one slow model cannot take the budget
  //
  // Worst case: advocates run to 10s, judges start with 11s left and are capped
  // at 10, so models stop by 20s and 10s remain. The committed allocation uses
  // about 21s of wall clock from a terminal, most of it in the two stages, so
  // it fits — but not with much to spare, which is itself worth knowing.
  //
  // If this ever needs raising, raise it because the log says a longer duration
  // is allowed, not because the documentation does.
  const PLATFORM_LIMIT_MS = Number(process.env.FUNCTION_LIMIT_MS ?? 30_000);
  const RESERVED_MS = 9_000;          // everything that is not a model call
  const MODEL_BUDGET_MS = PLATFORM_LIMIT_MS - RESERVED_MS;
  const CALL_TIMEOUT_MS = Math.min(10_000, Math.floor(MODEL_BUDGET_MS / 2));
  const deadlineAt = Date.now() + MODEL_BUDGET_MS;

  let provider;
  try {
    provider = makeOpenRouterProvider({
      jsonMode: 'object',
      timeoutMs: CALL_TIMEOUT_MS,
      deadlineAt,
    });
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

export const config = { path: '/api/deliberate' };
