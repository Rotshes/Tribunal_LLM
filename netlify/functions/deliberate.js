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
  // Netlify's synchronous limit is 60 seconds and is not configurable. Checked
  // against the documentation on 31.08.2026 rather than recalled — the figure
  // in this file was once invented from memory and killed every browser run.
  //
  // TWO ATTEMPTS AT THIS FAILED, and the second is the instructive one:
  //
  //   1. 90s per call. Longer than the whole invocation was allowed to live, so
  //      no call could ever time out on our side and the platform killed the
  //      run instead. 504, seven results lost.
  //   2. 24s per call, derived as (60 − 8) ÷ 2 stages. Still 504. The
  //      arithmetic was right and the shape was wrong: two independent
  //      timeouts are not a budget, they are two chances to spend the maximum.
  //      48s of models plus a cold start plus four sequential Supabase inserts
  //      does not fit in 60, and nothing in the code knew how much had already
  //      been spent.
  //
  // So: an absolute DEADLINE, computed once, passed down, and shrinking. Each
  // call gets whatever is left, capped. A run that overspends early fails its
  // later calls immediately — cheaply, visibly, and as failed columns beside
  // whatever did land, which is what this project says a failure should look
  // like.
  //
  //   60s platform limit
  //  −15s cold start, seven prompt hashes, four Supabase inserts, the response,
  //      and margin — the last time this reserve was 8s it was not enough
  //  = 45s of model time, total, for all seven calls
  //   20s cap on any single call, so one slow model cannot eat the whole budget
  //
  // Worst case now: advocates run to 20s, judges start with 25s left and are
  // capped at 20, so the models stop by 40s and 20s remain for everything else.
  const PLATFORM_LIMIT_MS = 60_000;   // Netlify, documented, not configurable.
  const RESERVED_MS = 15_000;         // everything that is not a model call
  const MODEL_BUDGET_MS = PLATFORM_LIMIT_MS - RESERVED_MS;
  const CALL_TIMEOUT_MS = 20_000;     // cap on one call, inside that budget
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
