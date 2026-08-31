// Persisting a whole deliberation.
//
// `logs/model-calls.jsonl` records what each call COST. This records what each
// call SAID. Both are needed and they are not the same artifact: the call log
// answers "what did seven calls consume", this answers "what did the tribunal
// hold, and on what grounds".
//
// Without this the opinions exist only in terminal scrollback, which makes
// comparing two runs impossible and makes any claim about run-to-run variance
// or model differences unsupportable. Turn 004 found that out by trying.
//
// Shape note: this is the `deliberations` + `opinions` rows the Supabase schema
// will hold, written to a file because there is no Supabase project yet. Same
// reasoning as the call log — deferring the destination, not the decision.

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join('logs', 'deliberations');

/**
 * One JSON file per run, named by deliberation id.
 * Deliberately NOT one appended file: a deliberation is a document, and a
 * whole run should be readable and diffable on its own.
 */
export function persistDeliberation(result, caseObj, meta = {}) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${result.deliberation_id}.json`);

  const doc = {
    deliberation_id: result.deliberation_id,
    case_id: result.case_id,
    ran_at: new Date().toISOString(),
    status: result.status,

    // What produced it. Without these a stored run cannot be compared to
    // another one, which is the whole point of storing it.
    provider: meta.provider ?? null,
    json_mode: meta.json_mode ?? null,
    model: meta.model ?? null,
    temperature: meta.temperature ?? null,

    usage: result.log.summary(),

    // Every call attempted, including failures. Duplicated from
    // logs/model-calls.jsonl on purpose: that file is append-only across all
    // runs, this document is one run readable on its own — and it is what the
    // Supabase sink writes from.
    model_calls: result.log.rows,

    // There is no combined result here and there is no field able to hold one.
    // The three rulings are stored as three peers, exactly as they are shown.
    advocate_opinions: result.advocate_opinions,
    advocate_failures: result.advocate_failures ?? [],
    judge_opinions: result.judge_opinions,
    judge_failures: result.judge_failures ?? [],

    reported: result.reported ?? null,
    gate_problems: result.gate_problems ?? [],
    cap_error: result.cap_error ?? null,

    // The case as it stood when this ran. An agreed_facts array that later
    // gains an entry would otherwise silently change what index [3] meant.
    case_snapshot: {
      title: caseObj.title,
      agreed_facts: caseObj.agreed_facts,
      issue: caseObj.issue,
      representatives: caseObj.representatives.map((r) => ({
        id: r.id,
        seat: r.seat,
      })),
    },
  };

  fs.writeFileSync(file, JSON.stringify(doc, null, 2), 'utf8');
  return { file, doc };
}

export function loadDeliberations() {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))
    .sort((a, b) => a.ran_at.localeCompare(b.ran_at));
}
