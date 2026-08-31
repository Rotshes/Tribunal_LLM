// The real provider. Holds the key, makes the call, reports what it cost.
//
// The key is read from the environment and never leaves this module. Nothing
// here is imported by anything that runs in a browser.

import { modelMap, REQUIRES_MODEL_ENV } from '../config.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export function makeOpenRouterProvider({ timeoutMs = 90_000 } = {}) {
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

  return {
    name: 'openrouter',
    async call({ role, roleId, system, user }) {
      const model = modelMap()[`${role}.${roleId}`];
      if (!model) {
        throw new Error(
          `No model mapped for ${role}.${roleId}. ${REQUIRES_MODEL_ENV} is empty — ` +
            'check .env has a model slug and that it is being read.',
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
            // The prompts demand one JSON object and nothing else. Asking the
            // provider to enforce it as well does not make G2 redundant: not
            // every model honours this, and G2 is what tells us which.
            response_format: { type: 'json_object' },

            // Support for response_format is per ENDPOINT, not per model: the
            // same model is served by several providers and only some honour
            // it. Without this, OpenRouter may route to one that ignores the
            // parameter — the request succeeds, prose comes back, and G2
            // rejects a call you have already paid for. That is exactly what
            // happened to tyrion_lannister on the first real run (turn 003).
            //
            // require_parameters restricts routing to endpoints that support
            // every parameter sent. It can mean fewer available endpoints and
            // occasionally a slower or unavailable route; a hard failure is
            // preferable to a silent downgrade.
            provider: { require_parameters: true },

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
