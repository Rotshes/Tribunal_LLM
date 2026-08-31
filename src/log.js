// One row per model call, including the ones that failed.
// docs/decisions/0001-log-every-model-call.md
//
// Rows go to logs/model-calls.jsonl for now. The field names are exactly the
// columns the Supabase `model_calls` table will have, so moving the sink later
// is a change of destination, not of shape. Writing to a file first is not a
// shortcut around the decision — it is the decision, with the database part
// deferred until there is a Supabase project to point at.

import fs from 'node:fs';
import path from 'node:path';

const DIR = 'logs';
const FILE = path.join(DIR, 'model-calls.jsonl');

export function makeCallLog() {
  const rows = [];

  return {
    rows,

    /** Called for every attempt, success or failure. No exceptions. */
    record({
      deliberation_id,
      case_id,
      role,
      role_id,
      model,
      prompt_version,
      prompt_sha256,
      succeeded,
      failure_reason = null,
      tokens_in = null,
      tokens_out = null,
      cost = null,
      latency_ms,
    }) {
      const row = {
        ts: new Date().toISOString(),
        deliberation_id,
        case_id,
        role,
        role_id,
        model,
        prompt_version,
        prompt_sha256,
        succeeded,
        failure_reason,
        tokens_in,
        tokens_out,
        cost,
        latency_ms,
      };
      rows.push(row);
      return row;
    },

    flush() {
      fs.mkdirSync(DIR, { recursive: true });
      fs.appendFileSync(
        FILE,
        rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
        'utf8',
      );
      return FILE;
    },

    summary() {
      const ok = rows.filter((r) => r.succeeded).length;
      return {
        attempted: rows.length,
        succeeded: ok,
        failed: rows.length - ok,
        tokens_in: rows.reduce((a, r) => a + (r.tokens_in ?? 0), 0),
        tokens_out: rows.reduce((a, r) => a + (r.tokens_out ?? 0), 0),
        total_latency_ms: rows.reduce((a, r) => a + (r.latency_ms ?? 0), 0),
      };
    },
  };
}
