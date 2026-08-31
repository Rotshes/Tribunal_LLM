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

    summary({ wall_ms = null } = {}) {
      const ok = rows.filter((r) => r.succeeded).length;
      return {
        attempted: rows.length,
        succeeded: ok,
        failed: rows.length - ok,
        tokens_in: rows.reduce((a, r) => a + (r.tokens_in ?? 0), 0),
        tokens_out: rows.reduce((a, r) => a + (r.tokens_out ?? 0), 0),

        // MODEL TIME: the sum of seven call latencies. It measures how much
        // model work a deliberation costs, and it is NOT how long anyone
        // waited — running calls concurrently leaves it unchanged.
        //
        // It was previously the only figure reported, under the label "total
        // latency", and was read as elapsed time all through turns 007 and 008.
        // Every wall-clock claim made about the timeout problem rested on it.
        // Renamed so the distinction cannot be misread again.
        model_time_ms: rows.reduce((a, r) => a + (r.latency_ms ?? 0), 0),

        // WALL CLOCK: what a person actually waits, measured by the caller
        // around the whole deliberation. This is the number that has to fit
        // inside a function timeout.
        wall_ms,

        // How much the concurrency is buying. 1.0 would mean fully sequential.
        concurrency_gain:
          wall_ms && wall_ms > 0
            ? Number((rows.reduce((a, r) => a + (r.latency_ms ?? 0), 0) / wall_ms).toFixed(2))
            : null,
      };
    },
  };
}
