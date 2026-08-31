// GET /api/case?id=T-001 — the charge sheet, for the page to display.
//
// The case is served from the repository fixture rather than copied into web/.
// Two copies of a charge sheet would drift, and the one the browser showed
// would eventually not be the one the models were given — a difference nobody
// would notice until an opinion cited a fact the reader could not see.

import fs from 'node:fs';
import path from 'node:path';

export default async function handler(req) {
  const id = new URL(req.url).searchParams.get('id') ?? 'T-001';

  // Pattern-checked, not path-joined from user input: this function must not be
  // persuadable to read an arbitrary file.
  if (!/^T-\d{3}$/.test(id)) {
    return new Response(JSON.stringify({ error: 'Bad case id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dir = path.join(process.cwd(), 'cases');
  const file = fs.readdirSync(dir).find((f) => f.startsWith(id) && f.endsWith('.json'));
  if (!file) {
    return new Response(JSON.stringify({ error: `No such case: ${id}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(fs.readFileSync(path.join(dir, file), 'utf8'), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export const config = { path: '/api/case' };
