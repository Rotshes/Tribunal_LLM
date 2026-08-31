// Writing a deliberation to Supabase.
//
// Uses PostgREST over plain fetch rather than @supabase/supabase-js. That is a
// deliberate choice, not laziness: adding a dependency is on the stop-and-ask
// list, the client library would be one more thing in a Netlify function
// bundle, and everything needed here is four POSTs. If the app later needs
// realtime or auth, the library becomes worth asking for.
//
// The secret key bypasses row-level security, so this module is backend-only
// and nothing that runs in a browser may import it.

const HEADERS = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  // Do not send the inserted rows back; we do not read them and a deliberation
  // is large.
  Prefer: 'return=minimal,resolution=merge-duplicates',
});

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function requireConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SECRET_KEY must both be set. The secret key is ' +
        'the sb_secret_... one from Settings > API Keys, not the publishable key ' +
        'and not the legacy service_role.',
    );
  }
  return { url: url.replace(/\/+$/, ''), key };
}

async function insert(table, rows, { fetchImpl = fetch } = {}) {
  if (!rows || rows.length === 0) return 0;
  const { url, key } = requireConfig();

  const res = await fetchImpl(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: HEADERS(key),
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase insert into ${table} failed: ${res.status} ${body}`);
  }
  return rows.length;
}

const opinionRow = (deliberation_id, case_id, o) => ({
  deliberation_id,
  case_id,
  role: o.role,

  representative_id: o.representative_id ?? null,
  seat: o.seat ?? null,
  position: o.position ?? null,
  case_for_seat: o.case_for_seat ?? null,
  key_points: o.key_points ?? null,
  concedes: o.concedes ?? null,
  argument: o.argument ?? null,

  judge_id: o.judge_id ?? null,
  method: o.method ?? null,
  ruling: o.ruling ?? null,
  grounds: o.grounds ?? null,
  responds_to: o.responds_to ?? null,
  reasoning: o.reasoning ?? null,
  disclaimer: o.disclaimer ?? null,

  relies_on_facts: o.relies_on_facts ?? [],
  model_id: o.model_id,
  prompt_version: o.prompt_version,
  prompt_sha256: o.prompt_sha256,
});

/**
 * Reads stored deliberations back, newest last, in the shape `tools/compare.js`
 * expects from a local file. The database is the record — turn 006 said so and
 * turn 009 made it true for runs that came through the app.
 */
export async function readDeliberations({ limit = 200, fetchImpl = fetch } = {}) {
  const { url, key } = requireConfig();

  const get = async (path) => {
    const res = await fetchImpl(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      throw new Error(`Supabase read of ${path} failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
  };

  const runs = await get(
    `deliberations?select=*&order=ran_at.asc&limit=${Number(limit)}`,
  );
  if (runs.length === 0) return [];

  const ids = runs.map((r) => `"${r.deliberation_id}"`).join(',');
  const opinions = await get(`opinions?select=*&deliberation_id=in.(${ids})`);

  const byRun = new Map(runs.map((r) => [r.deliberation_id, r]));
  const grouped = new Map(runs.map((r) => [r.deliberation_id, []]));
  for (const o of opinions) grouped.get(o.deliberation_id)?.push(o);

  return runs.map((r) => {
    const os = grouped.get(r.deliberation_id) ?? [];
    return {
      ...r,
      // compare reads `usage`; rebuild it from the flattened columns.
      usage: {
        attempted: r.calls_attempted,
        succeeded: r.calls_succeeded,
        failed:
          r.calls_attempted != null && r.calls_succeeded != null
            ? r.calls_attempted - r.calls_succeeded
            : null,
        tokens_in: r.tokens_in,
        tokens_out: r.tokens_out,
        wall_ms: r.wall_ms,
        model_time_ms: r.model_time_ms,
      },
      advocate_opinions: os.filter((o) => o.role === 'advocate'),
      judge_opinions: os.filter((o) => o.role === 'judge'),
      // Failures are in model_calls, not opinions. Not fetched here: compare
      // uses them only for the "why calls failed" section, and pulling every
      // call row for every run to fill one table is not worth the request.
      advocate_failures: [],
      judge_failures: [],
      source: 'supabase',
    };
  });
}

/**
 * Writes the case, the run, its opinions and every model call.
 *
 * Order matters: charge sheet, then deliberation, then the rest — the foreign
 * keys require it. Not a transaction, because PostgREST does not give us one
 * across four requests. A partial write is therefore possible; the deliberation
 * row is what everything else hangs off, so if it lands and the opinions do
 * not, the run is visibly incomplete rather than silently absent.
 *
 * There is no combined result written here because there is no combined result
 * to write, and no column to put one in.
 */
export async function writeDeliberation(doc, caseObj, opts = {}) {
  const written = { charge_sheets: 0, deliberations: 0, opinions: 0, model_calls: 0 };

  written.charge_sheets = await insert('charge_sheets', [{
    case_id: caseObj.case_id,
    title: caseObj.title,
    fictional: caseObj.fictional,
    accused: caseObj.accused,
    affected_party: caseObj.affected_party,
    act_alleged: caseObj.act_alleged,
    background: caseObj.background,
    agreed_facts: caseObj.agreed_facts,
    issue: caseObj.issue,
    scope: caseObj.scope,
    representatives: caseObj.representatives,
    provenance: caseObj.provenance,
  }], opts);

  written.deliberations = await insert('deliberations', [{
    deliberation_id: doc.deliberation_id,
    case_id: doc.case_id,
    ran_at: doc.ran_at,
    status: doc.status,
    provider: doc.provider,
    json_mode: doc.json_mode,
    model: doc.model,
    model_map: doc.model_map ?? null,
    temperature: doc.temperature,

    // Flattened out of `usage` so a run is comparable straight from the
    // database. Before turn 009 these lived only in the local JSON, which the
    // Netlify function never writes — so every run through the app was
    // invisible to `npm run compare`, the tool the model-progression argument
    // depends on.
    wall_ms: doc.usage?.wall_ms ?? null,
    model_time_ms: doc.usage?.model_time_ms ?? null,
    calls_attempted: doc.usage?.attempted ?? null,
    calls_succeeded: doc.usage?.succeeded ?? null,
    tokens_in: doc.usage?.tokens_in ?? null,
    tokens_out: doc.usage?.tokens_out ?? null,
    gate_problems: doc.gate_problems ?? [],
    cap_error: doc.cap_error ?? null,
    reported: doc.reported ?? null,
    case_snapshot: doc.case_snapshot,
  }], opts);

  written.opinions = await insert(
    'opinions',
    [...doc.advocate_opinions, ...doc.judge_opinions].map((o) =>
      opinionRow(doc.deliberation_id, doc.case_id, o),
    ),
    opts,
  );

  written.model_calls = await insert('model_calls', (doc.model_calls ?? []).map((r) => ({
    deliberation_id: doc.deliberation_id,
    case_id: r.case_id,
    role: r.role,
    role_id: r.role_id,
    model: r.model,
    prompt_version: r.prompt_version,
    prompt_sha256: r.prompt_sha256,
    succeeded: r.succeeded,
    failure_reason: r.failure_reason,
    tokens_in: r.tokens_in,
    tokens_out: r.tokens_out,
    cost: r.cost,
    latency_ms: r.latency_ms,
    ts: r.ts,
  })), opts);

  return written;
}
