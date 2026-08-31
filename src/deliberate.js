// The orchestrator. Four advocates in parallel, then three judges.
//
// There is no aggregation anywhere in this file, and no variable holding a
// combined result. If you ever find yourself computing one from the three
// rulings, stop. docs/decisions/0002-verdicts-are-never-combined.md

import crypto from 'node:crypto';
import {
  ADVOCATE_ORDER,
  JUDGE_ORDER,
  EXPECTED_CALLS,
  callCap,
  resolveModelMap,
} from './config.js';
import { loadPrompt, advocateUserMessage, judgeUserMessage } from './prompts.js';
import {
  g1ChargeSheet,
  g2OpinionEnvelope,
  g4CallBudget,
  g7LogCompleteness,
} from './gates.js';
import { makeCallLog } from './log.js';
import { judgeMethod, judgeDisclaimer } from './panel.js';

class CapExceeded extends Error {}

export async function deliberate({
  caseObj,
  provider,
  modelOverrides = {},
  allowedIds = null,
  // The caller may supply the id. The background function needs this: the
  // browser is told the id BEFORE the run starts, because a background
  // invocation answers 202 with an empty body and the page has nothing else to
  // poll for. Generated here when nobody supplies one, which is every other
  // caller.
  //
  // A supplied id is not trusted to be well-formed — a bad one would poison a
  // primary key — so it is checked against the uuid shape and otherwise
  // replaced rather than used.
  deliberationId = null,
}) {
  const deliberation_id =
    typeof deliberationId === 'string' && /^[0-9a-f-]{36}$/i.test(deliberationId)
      ? deliberationId
      : crypto.randomUUID();
  const log = makeCallLog();
  const began = Date.now();

  // Read once per deliberation, after the caller has loaded the environment.
  // Overrides are untrusted (a visitor's dropdown); resolveModelMap checks the
  // role exists and the model is on the allowlist, and reports rather than
  // silently ignoring anything it rejects.
  const { map: MODELS, problems: modelProblems } = resolveModelMap(
    modelOverrides,
    allowedIds,
  );
  const CAP = callCap();

  if (modelProblems.length) {
    return {
      deliberation_id,
      case_id: caseObj?.case_id ?? null,
      status: 'failed',
      failed_gate: 'G0',
      problems: modelProblems,
      advocate_opinions: [],
      judge_opinions: [],
      model_map: MODELS,
      log,
    };
  }

  // G1 — before anything is spent.
  const g1 = g1ChargeSheet(caseObj);
  if (g1.length) {
    return {
      deliberation_id,
      case_id: caseObj?.case_id ?? null,
      status: 'failed',
      failed_gate: 'G1',
      problems: g1,
      advocate_opinions: [],
      judge_opinions: [],
      model_map: MODELS,
      log,
    };
  }

  let attempted = 0;

  async function callOnce({ role, roleId, user }) {
    if (attempted >= CAP) {
      throw new CapExceeded(`call cap of ${CAP} reached before ${role}.${roleId}`);
    }
    attempted += 1;

    const prompt = loadPrompt(roleId);
    const started = Date.now();

    const base = {
      deliberation_id,
      case_id: caseObj.case_id,
      role,
      role_id: roleId,
      model: MODELS[`${role}.${roleId}`] ?? provider.name,
      prompt_version: prompt.version,
      prompt_sha256: prompt.sha256,
    };

    try {
      const res = await provider.call({
        role,
        roleId,
        model: MODELS[`${role}.${roleId}`],
        system: prompt.system,
        user,
        caseObj,
      });

      let parsed;
      try {
        parsed = JSON.parse(res.raw);
      } catch {
        // Fluent prose where a structured object was demanded. The most
        // common failure in this design, and the one that must never reach
        // the screen looking like a ruling.
        throw new Error('response was not JSON (model returned prose)');
      }

      // NEVER ASK THE MODEL FOR A VALUE THE SYSTEM ALREADY HAS.
      //
      // Everything attached below is known before the call is made. Asking for
      // it buys nothing and costs a whole call every time the model fumbles a
      // string it was handed. This project has paid for that four times:
      //   - provenance fields, which broke all seven calls (turn 002)
      //   - the disclaimer, which a judge paraphrased (turn 003)
      //   - representative_id, misspelled as "daenerys_targator" and
      //     "daenerys_targatorn" in two separate runs (turn 004)
      //
      // The model supplies only what ONLY it can supply: the reasoning.
      // G2 then validates the completed opinion — the object that gets stored,
      // not the fragment that came off the wire.
      const identity =
        role === 'advocate'
          ? (() => {
              const rep = caseObj.representatives.find((r) => r.id === roleId);
              return { representative_id: rep.id, seat: rep.seat };
            })()
          : { judge_id: roleId, method: judgeMethod(roleId) };

      const opinion = {
        ...parsed,
        ...identity,
        ...(role === 'judge' ? { disclaimer: judgeDisclaimer() } : {}),
        model_id: res.model ?? base.model ?? provider.name,
        prompt_version: prompt.version,
        prompt_sha256: prompt.sha256,
      };

      const problems = g2OpinionEnvelope(opinion, caseObj);
      if (problems.length) {
        throw new Error(`failed G2/G3: ${problems.join('; ')}`);
      }

      log.record({
        ...base,
        model: res.model ?? base.model,
        succeeded: true,
        tokens_in: res.usage?.in ?? null,
        tokens_out: res.usage?.out ?? null,
        cost: res.usage?.cost ?? null,
        latency_ms: Date.now() - started,
      });

      return { ok: true, opinion };
    } catch (err) {
      if (err instanceof CapExceeded) throw err;

      // Failures are logged. They are the interesting rows: without them the
      // failure rate is unknowable.
      log.record({
        ...base,
        succeeded: false,
        failure_reason: err.message,
        latency_ms: Date.now() - started,
      });

      return { ok: false, role, roleId, reason: err.message };
    }
  }

  let capError = null;

  // --- The four advocates, concurrently. They do not see each other.
  const advocateResults = await Promise.all(
    ADVOCATE_ORDER.map((id) =>
      callOnce({
        role: 'advocate',
        roleId: id,
        user: advocateUserMessage(caseObj, id),
      }).catch((e) => {
        if (e instanceof CapExceeded) capError = e;
        return { ok: false, role: 'advocate', roleId: id, reason: e.message };
      }),
    ),
  );

  const advocate_opinions = advocateResults.filter((r) => r.ok).map((r) => r.opinion);
  const advocate_failures = advocateResults.filter((r) => !r.ok);

  // --- The three judges, after all four advocates are in hand.
  //
  // Every judge receives the SAME user message. It is built once, here, and
  // reused — not rebuilt per judge — so that "identical input" is a property
  // of the code rather than a promise in a document.
  const judgeUser = judgeUserMessage(caseObj, advocate_opinions);

  // The three judges run CONCURRENTLY.
  //
  // They are independent by construction: each receives the same `judgeUser`
  // string, none sees another's ruling, and none is told another exists. That
  // is the load-bearing property of the whole design, and it means sequencing
  // them buys exactly nothing — it only made a deliberation three judge-calls
  // long in wall-clock instead of one.
  //
  // It also stopped mattering hypothetically on 31.08: `netlify dev` runs
  // functions with a 30s cap and the browser could not complete a deliberation
  // locally. The wall-clock figures quoted at the time were wrong — they came
  // from the summed per-call latency, which concurrency does not change. The
  // run now measures elapsed time separately; see `wall_ms` in log.js.
  //
  // Promise.all preserves input order, so judge_opinions still arrive in
  // JUDGE_ORDER and the display columns do not move.
  const judgeResults = await Promise.all(
    JUDGE_ORDER.map((id) =>
      callOnce({ role: 'judge', roleId: id, user: judgeUser }).catch((e) => {
        if (e instanceof CapExceeded) capError = e;
        return { ok: false, role: 'judge', roleId: id, reason: e.message };
      }),
    ),
  );

  const judge_opinions = judgeResults.filter((r) => r.ok).map((r) => r.opinion);
  const judge_failures = judgeResults.filter((r) => !r.ok);

  // G4 and G7.
  const gateProblems = [
    ...g4CallBudget({ attempted, expected: EXPECTED_CALLS, cap: CAP }),
    ...g7LogCompleteness({ attempted, logged: log.rows.length }),
  ];

  const status =
    judge_failures.length === 0 && advocate_failures.length === 0
      ? 'complete'
      : judge_opinions.length === 0
        ? 'failed'
        : 'partial';

  return {
    deliberation_id,
    case_id: caseObj.case_id,
    status,
    wall_ms: Date.now() - began,
    // The actual per-role allocation for THIS run. A single `model` string is
    // wrong the moment two roles differ, and compare would group by it.
    model_map: MODELS,
    cap_error: capError?.message ?? null,
    gate_problems: gateProblems,
    advocate_opinions,
    advocate_failures,
    judge_opinions,
    judge_failures,
    // Reported, never enforced. An advocate concluding against its own seat is
    // permitted; four advocates that concede nothing are the signal that three
    // distinct voices have collapsed into one.
    reported: {
      seat_divergence: advocate_opinions
        .filter(
          (o) =>
            (o.seat === 'defense' && o.position === 'not_justified') ||
            (o.seat === 'prosecution' && o.position === 'justified'),
        )
        .map((o) => o.representative_id),
      concessions_made: advocate_opinions.filter((o) => (o.concedes ?? []).length)
        .length,
      rulings: judge_opinions.map((o) => ({ judge: o.judge_id, ruling: o.ruling })),
    },
    log,
  };
}
