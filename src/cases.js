// Which case ids exist, and which one is free next.
//
// WHY THIS EXISTS
//
// `docs/02-charge-sheet-spec.md` lists "case_id unique among stored cases" as
// step 2 of the validation order. It was specified on 24.08.2026 and never
// implemented, because until turn 021 no charge sheet could arrive except as a
// repository fixture and the question could not come up.
//
// A form makes it load-bearing, and the reason is worse than a duplicate row.
// The Supabase sink sends `Prefer: resolution=merge-duplicates`, so a write to
// an existing `case_id` UPSERTS. A visitor submitting a case as `T-001` would
// therefore overwrite the instructor's case in place — and every opinion this
// project has stored cites `agreed_facts` BY INDEX. `db/schema.sql` says it
// outright: reordering or deleting an entry silently invalidates every opinion
// already stored against the case. Thirty-odd archived opinions would keep
// rendering, keep citing "fact 3", and be citing a different fact.
//
// So uniqueness is not tidiness here. It is what stops one form submission
// rewriting the evidence behind every run in the archive.

import fs from 'node:fs';
import path from 'node:path';

const PATTERN = /^T-\d{3}$/;

/**
 * The ids of the repository fixtures.
 *
 * These are the ones that must never be overwritten and the ones this check can
 * always see: they are files in the repo, so no network, no database, and no
 * failure mode that leaves them unknown.
 */
export function fixtureCaseIds(dir = path.join(process.cwd(), 'cases')) {
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return []; // no cases directory is a deployment problem, not a bad request
  }
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, f.indexOf('-', 2)))
    .filter((id) => PATTERN.test(id));
}

/**
 * The lowest `T-nnn` not in `taken`.
 *
 * Offered to the submitter when their chosen id collides, because "that id is
 * taken" without a free one is a puzzle rather than a message. Returns null
 * past T-999, which this project will not reach and which is still not a
 * reason to return something wrong.
 */
export function nextFreeCaseId(taken = []) {
  const used = new Set(taken);
  for (let n = 1; n <= 999; n += 1) {
    const id = `T-${String(n).padStart(3, '0')}`;
    if (!used.has(id)) return id;
  }
  return null;
}

/**
 * Is this id free, and if not, what is?
 *
 * `storedIds` is passed in rather than fetched here: this module must stay
 * usable without a database, and the caller is the one that knows whether the
 * stored list could be read at all. When it could not, the fixtures are still
 * checked — which is the half that protects the cases that cannot be replaced.
 */
export function checkCaseIdFree(caseId, storedIds = null, dir = undefined) {
  const fixtures = fixtureCaseIds(dir);
  const taken = [...fixtures, ...(storedIds ?? [])];
  const free = !taken.includes(caseId);

  return {
    free,
    suggestion: free ? null : nextFreeCaseId(taken),
    // Said out loud so a caller cannot mistake a partial check for a full one.
    checked_stored: storedIds !== null,
  };
}
