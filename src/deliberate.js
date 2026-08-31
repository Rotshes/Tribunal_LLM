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
  modelMap,
  REQUIRES_MODEL_ENV,
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

export async function deliberate({ caseObj, provider }) {
  const deliberation_id = crypto.randomUUID();
  const log = makeCallLog();

  // Read once per deliberation, after the caller has loaded the environment.
  const MODELS = modelMap();
  const CAP = callCap();

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

  const judgeResults = [];
  for (const id of JUDGE_ORDER) {
    if (capError) break;
    const r = await callOnce({
      role: 'judge',
      roleId: id,
      user: judgeUser,
    }).catch((e) => {
      if (e instanceof CapExceeded) capError = e;
      return { ok: false, role: 'judge', roleId: id, reason: e.message };
    });
    judgeResults.push(r);
  }

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
