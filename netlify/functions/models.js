// GET /api/models — the allowlist, for the picker to render.
//
// Sending this list is safe: it is the same list the backend validates against,
// so the browser cannot learn of a model it would be permitted to request.

import { allowedModels } from '../../src/models.js';
import { ROLE_KEYS, modelMap } from '../../src/config.js';

export default async function handler() {
  return new Response(
    JSON.stringify({
      models: allowedModels(),
      roles: ROLE_KEYS,
      // What each role uses if the visitor picks nothing. This is the committed
      // allocation, and it is what the project's model-progression argument is
      // about — a visitor's choice overrides it for one run and changes nothing.
      defaults: modelMap(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}

export const config = { path: '/api/models' };
