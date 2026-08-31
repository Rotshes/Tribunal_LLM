// The real provider. Holds the key, makes the call, reports what it cost.
//
// The key is read from the environment and never leaves this module. Nothing
// here is imported by anything that runs in a browser.

import { REQUIRES_MODEL_ENV } from '../config.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * jsonMode:
 *   'object' — send response_format: { type: 'json_object' }, and require the
 *              endpoint to support it. Safest, but narrows the model choice
 *              sharply: many capable models offer no json-mode endpoint at all
 *              and the request 404s with "no endpoints found".
 *   'off'    — send no response_format. The prompts already demand one JSON
 *              object and nothing else, and G2 rejects anything that is not
 *              one. Costs a call when a model disobeys; buys the freedom to
 *              compare models, which is the point of the exercise.
 *
 * This exists because the parameter was deciding which models could be tested.
 * A verification gate we already have should not be substituted for by a
 * routing constraint that halves the catalogue.
 */
export function makeOpenRouterProvider({
  timeoutMs = 90_000,
  jsonMode = 'object',
} = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Copy .env.example to .env and fill it in.',
    );
  }
  if (!process.env[REQUIRES_MODEL_ENV]) {
    throw new Error(
      `${REQUIRES_MODEL_ENV} is not set. There is deliberately no default model — ` +
        'naming one in code would make an unreviewed choice permanent by accident. ' +
        'Set it in .env, and record the choice in a decision file.',
    );
  }

  if (!['object', 'off'].includes(jsonMode)) {
    throw new Error(`Unknown jsonMode "${jsonMode}". Use object or off.`);
  }

  // Built once. `require_parameters` is sent ONLY alongside response_format,
  // because that is the parameter it exists to guarantee: it restricts routing
  // to endpoints supporting everything sent, which prevents the silent
  // downgrade that produced prose from tyrion_lannister in turn 003. Sending it
  // with nothing to guarantee would only narrow routing for no benefit.
  const jsonParams =
    jsonMode === 'object'
      ? {
          response_format: { type: 'json_object' },
          provider: { require_parameters: true },
        }
      : {};

  return {
    name: `openrouter(json:${jsonMode})`,
    async call({ role, roleId, model, system, user }) {
      // The model is decided by the caller (src/config.js resolveModelMap) and
      // handed in. This module does not look one up: a provider that chooses
      // its own model would make a mixed-model run untraceable.
      if (!model) {
        throw new Error(
          `No model for ${role}.${roleId}. ${REQUIRES_MODEL_ENV} is empty and no ` +
            'override was given — check .env has a model slug and that it is read.',
        );
      }

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);

      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          signal: ac.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            ...jsonParams,
            temperature: 0.7,
          }),
        });

        if (!res.ok) {
          throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
        }

        const body = await res.json();
        const raw = body.choices?.[0]?.message?.content;
        if (typeof raw !== 'string' || raw.trim() === '') {
          // An empty response is a failure, not an acquittal. It is returned
          // as a failure so the caller displays it as one.
          throw new Error('model returned an empty response');
        }

        return {
          raw,
          model,
          usage: {
            in: body.usage?.prompt_tokens ?? null,
            out: body.usage?.completion_tokens ?? null,
            cost: body.usage?.cost ?? null,
          },
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
