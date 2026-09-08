// POST /api/validate — run G1 on a charge sheet and answer. No models called.
//
// WHY THIS ENDPOINT EXISTS, WHEN /api/deliberate ALREADY RUNS G1
//
// Because /api/deliberate is a BACKGROUND function (decision 0011). It answers
// 202 with an empty body the instant it is invoked, before a line of its own
// code runs. Its 422 — the one carrying `problems` — is written to a response
// nobody reads. Turn 013 recorded that cost for unhandled errors; a form makes
// it bite on the ordinary path, because definition-of-done item 7 is:
//
//   "Submitting an incomplete charge sheet produces a message naming the
//    missing field, before any model is called."
//
// A background function cannot meet that. It cannot say anything to a browser.
// So the gate needs a synchronous door, and this is it: G1 runs here, in front,
// where a 422 reaches the page that asked.
//
// THIS IS NOT A SECOND IMPLEMENTATION OF THE GATE. It imports `g1ChargeSheet`
// from src/gates.js — the same function, the same schema file, the same
// ajv instance — and /api/deliberate still runs it too. Two doors, one gate: a
// POST straight to /api/deliberate that skips the form is still validated, and
// this endpoint being wrong could only ever make it stricter, never permissive.
//
// It calls no model and writes nothing. A visitor may hammer it for free, which
// is the point: fixing a charge sheet one field at a time must cost nothing.

import { g1ChargeSheet } from '../../src/gates.js';
import { checkCaseIdFree } from '../../src/cases.js';
import { supabaseConfigured, readCaseIds } from '../../src/sinks/supabase.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req) {
  try {
    return await runValidation(req);
  } catch (err) {
    // This one IS readable — a synchronous function's response reaches the
    // browser — so it says what happened rather than leaving the platform to
    // substitute "An unknown error has occurred".
    console.error('[validate] unhandled failure:', err?.stack ?? err);
    return json(500, {
      error: 'The charge sheet could not be checked.',
      detail: err?.message ?? String(err),
    });
  }
}

async function runValidation(req) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Body must be JSON.' });
  }

  const sheet = body?.charge_sheet;
  if (!sheet || typeof sheet !== 'object' || Array.isArray(sheet)) {
    return json(400, { error: 'Send { "charge_sheet": { … } }.' });
  }

  // Every violation, not the first. The spec's reason is that a submitter who
  // fixes one field per attempt would otherwise pay seven model calls a go;
  // here nothing is paid, and the reason becomes simply that a form with one
  // error shown at a time is a form nobody finishes.
  const problems = g1ChargeSheet(sheet);

  // Step 2 of the validation order, implemented for the first time. Separate
  // from g1ChargeSheet() on purpose: that function is pure and synchronous and
  // is called from the runner, from tests and from the CLI, none of which have
  // a database. Uniqueness needs one.
  let storedIds = null;
  let storageNote = null;
  if (supabaseConfigured()) {
    try {
      storedIds = await readCaseIds();
    } catch (err) {
      // Partial, and admitted. Refusing every submission because the database
      // has paused itself would be a worse failure than a check that says what
      // it did not cover — and the fixtures, which are the cases that cannot be
      // replaced, are checked either way.
      storageNote =
        'Stored cases could not be read, so this id was only checked against the ' +
        'repository fixtures. It may still collide with a case submitted earlier.';
      console.error('[validate] case id check degraded:', err.message);
    }
  } else {
    storageNote =
      'No database is configured, so this id was only checked against the ' +
      'repository fixtures.';
  }

  const id = checkCaseIdFree(sheet.case_id, storedIds);
  if (typeof sheet.case_id === 'string' && !id.free) {
    problems.push(
      `/case_id "${sheet.case_id}" already exists. ` +
        (id.suggestion
          ? `${id.suggestion} is free.`
          : 'Every id from T-001 to T-999 is taken.'),
    );
  }

  if (problems.length) {
    return json(422, {
      error: 'The charge sheet was rejected. Nothing was called and nothing was spent.',
      problems,
      suggested_case_id: id.free ? null : id.suggestion,
      note: storageNote,
    });
  }

  return json(200, { ok: true, case_id: sheet.case_id, note: storageNote });
}

export const config = { path: '/api/validate' };
