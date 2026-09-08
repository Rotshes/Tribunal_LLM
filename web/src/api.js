// Every call this app makes to its own backend, in one file.
//
// The functions are unchanged by the React migration — they were always the
// contract, and keeping the calls here means a component never contains a URL.

const POLL_EVERY_MS = 2_000;
const POLL_GIVE_UP_MS = 240_000; // four minutes; the run itself may take 15

export async function fetchCase(id = 'T-001') {
  const res = await fetch(`/api/case?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Could not load the case.');
  return res.json();
}

export async function fetchModels() {
  const res = await fetch('/api/models');
  if (!res.ok) throw new Error('Could not load the model list.');
  return res.json();
}

export async function fetchArchive() {
  const res = await fetch('/api/runs');
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body.runs ?? [];
}

export async function fetchRun(id) {
  const res = await fetch(`/api/runs?id=${encodeURIComponent(id)}`);
  const doc = await res.json().catch(() => null);
  if (!res.ok || !doc) {
    throw new Error(doc?.error ?? `That proceeding could not be opened (HTTP ${res.status}).`);
  }
  return doc;
}

/**
 * Check a charge sheet before anything is spent on it.
 *
 * `/api/deliberate` runs G1 too, and its answer is unreadable: it is a
 * background function, so it replies 202 with an empty body before its own
 * validation runs. Definition-of-done item 7 requires a message naming the
 * missing field, and a background function cannot give one. Hence a separate
 * synchronous endpoint in front of it — same imported gate, both doors.
 *
 * Returns { ok, note } on 200. Throws with `.problems` on 422 so the form can
 * put every violation against its own field.
 */
export async function validateSheet(chargeSheet) {
  const res = await fetch('/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ charge_sheet: chargeSheet }),
  });

  const body = await res.json().catch(() => null);
  if (res.ok) return body ?? { ok: true };

  const err = new Error(body?.error ?? `The charge sheet could not be checked (HTTP ${res.status}).`);
  err.problems = body?.problems ?? [];
  err.suggestedCaseId = body?.suggested_case_id ?? null;
  err.note = body?.note ?? null;
  throw err;
}

/**
 * Start a deliberation.
 *
 * `/api/deliberate` is a background function (decision 0011): it answers 202
 * with an empty body and keeps working for up to fifteen minutes. There is no
 * response to read, so the caller mints the id, sends it, and watches the
 * archive for it — the endpoint turn 011 built for retrieval is also the one
 * this polls.
 *
 * Returns the id it minted. Throws only if the invocation itself was refused,
 * which means the run never started.
 */
export async function convene({ caseId, chargeSheet, models }) {
  const id = crypto.randomUUID();

  // A case arrives by id (a repository fixture) or inline (the form). The
  // backend has accepted both since turn 011; until turn 021 nothing sent the
  // second, which is why definition-of-done item 1 sat at PARTIAL.
  const body = chargeSheet
    ? { charge_sheet: chargeSheet, models, deliberation_id: id }
    : { case_id: caseId, models, deliberation_id: id };

  const res = await fetch('/api/deliberate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status !== 202 && !res.ok) {
    const raw = await res.text();
    const err = new Error(`The tribunal could not be convened (HTTP ${res.status}).`);
    err.detail = raw.slice(0, 200).replace(/\s+/g, ' ').trim() || '(empty response)';
    throw err;
  }

  return id;
}

/**
 * Watch the archive until a run appears, or until we give up.
 *
 * Returns the stored deliberation, or null if it never arrived. A 404 while
 * polling is the ordinary case and not an error: it means the run has not
 * finished writing yet.
 */
export async function awaitResult(id, { signal } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_GIVE_UP_MS) {
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
    if (signal?.aborted) return null;

    try {
      const res = await fetch(`/api/runs?id=${encodeURIComponent(id)}`);
      if (res.status === 404) continue; // not written yet
      if (!res.ok) continue; // transient; keep watching
      const doc = await res.json();
      if (doc && doc.deliberation_id) return doc;
    } catch {
      // A dropped request while polling is not a failed deliberation. Keep
      // watching; the give-up clock is the only thing that ends this.
    }
  }
  return null;
}

export const POLL_GIVE_UP_SECONDS = POLL_GIVE_UP_MS / 1000;
