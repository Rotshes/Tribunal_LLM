// GET /api/runs           — the index of stored deliberations
// GET /api/runs?id=<uuid> — one stored deliberation, in full
//
// Definition of done item 3: "every case submitted is retrievable afterwards by
// someone who did not submit it." That is what this is. Before it, a run was
// retrievable by whoever still had the terminal open or the database dashboard
// logged in, which is not the same claim.
//
// Reads go through this function with the secret key rather than the browser
// talking to PostgREST directly. Row-level security therefore stays closed with
// no policies at all — see docs/decisions/0010. The short version: a public
// read policy would expose whole tables and every column in them, forever,
// including columns added later by someone not thinking about who can read
// them. This function exposes what it chooses to expose.

import { supabaseConfigured, readDeliberationIndex, readDeliberation } from '../../src/sinks/supabase.js';

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'GET only.' }, 405);

  if (!supabaseConfigured()) {
    // Said plainly rather than as an empty list. An empty list means "no runs
    // yet"; this means "the archive is not connected", and a reader who cannot
    // tell those apart will conclude the wrong thing about the project.
    return json(
      { error: 'The archive is not configured on this deployment.' },
      503,
    );
  }

  const id = new URL(req.url).searchParams.get('id');

  try {
    if (id) {
      const doc = await readDeliberation(id);
      if (!doc) return json({ error: 'No deliberation with that id.' }, 404);
      return json(doc, 200, { 'Cache-Control': 'public, max-age=60' });
    }

    const runs = await readDeliberationIndex({ limit: 50 });
    return json({ runs }, 200, { 'Cache-Control': 'public, max-age=30' });
  } catch (err) {
    // The id regex in readDeliberation rejects anything that is not a uuid, so
    // a malformed id is a 400 rather than a 500: it is the caller's mistake and
    // saying so is more useful than "something went wrong".
    if (/Not a deliberation id/.test(err.message)) {
      return json({ error: 'That is not a deliberation id.' }, 400);
    }
    return json({ error: `The archive could not be read: ${err.message}` }, 502);
  }
}

export const config = { path: '/api/runs' };
