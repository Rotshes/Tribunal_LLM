// The real provider. Holds the key, makes the call, reports what it cost.
//
// The key is read from the environment and never leaves this module. Nothing
// here is imported by anything that runs in a browser.

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
  // An absolute wall-clock deadline for the WHOLE deliberation, as an epoch
  // millisecond value. Null means no deadline, which is right for a terminal.
  //
  // A per-call timeout is not a budget. The seven calls run in two sequential
  // stages, so two 24-second timeouts are 48 seconds of models before anything
  // else has happened — and on the deployed site that plus a cold start and a
  // database write went past Netlify's 60-second limit and lost the whole run
  // for the second time (turn 012 §6c).
  //
  // A deadline is a budget, because it SHRINKS. Whatever the first stage
  // spends, the second stage does not get. A run that has already used its
  // time fails its remaining calls immediately instead of taking the platform
  // down with it — which is the difference between a partial result and no
  // result at all.
  deadlineAt = null,
  jsonMode = 'object',
} = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Copy .env.example to .env and fill it in.',
    );
  }
  // No environment check for a model here any more. Until turn 010 the model
  // came from TRIBUNAL_MODEL and an unset variable had to fail loudly; since
  // decision 0009 the allocation is committed in src/config.js, so the map is
  // always populated and the per-call check below is the one that matters.

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
          `No model for ${role}.${roleId}. The committed allocation in ` +
            'src/config.js should cover all seven roles — check modelMap().',
        );
      }

      // The effective timeout is the smaller of the per-call bound and what is
      // left of the deliberation's budget.
      const remaining = deadlineAt == null ? Infinity : deadlineAt - Date.now();
      const effectiveMs = Math.min(timeoutMs, remaining);

      if (effectiveMs <= 0) {
        // Out of budget before this call started. Fail it here rather than
        // spending money on an answer that cannot be returned: the platform
        // would kill the invocation mid-flight and every other result with it.
        throw new Error(
          `out of time before ${role}.${roleId} was called — the deliberation's ` +
            'budget was spent by the calls before it, so this one was not made',
        );
      }

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), effectiveMs);

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
      } catch (err) {
        // An aborted fetch throws "This operation was aborted", which says
        // nothing about why. This is now a path that fires in production —
        // the deployed function sets a timeout that fits Netlify's 60-second
        // limit — so the reason has to name itself: it goes straight into the
        // failure list on screen and into `failure_reason` in the database.
        if (err.name === 'AbortError' || /aborted/i.test(err.message ?? '')) {
          throw new Error(
            `no answer within ${Math.round(effectiveMs / 1000)}s (${model}) — the call was cut off, not refused`,
          );
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
