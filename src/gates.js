// The verification gates. docs/01-spec.md §4.
//
// A gate must be able to fail. Each function below returns a list of problems;
// an empty list is a pass. They never throw on bad input data — a gate that
// crashes instead of reporting has told you nothing useful.

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'node:fs';
import path from 'node:path';
import { judgeDisclaimer } from './panel.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const load = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const root = process.cwd();

const validateChargeSheet = ajv.compile(
  load(path.join(root, 'schemas/charge-sheet.schema.json')),
);
const validateOpinion = ajv.compile(
  load(path.join(root, 'schemas/opinion.schema.json')),
);

const fmt = (errors) =>
  (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`);

/**
 * G1 — the charge sheet, before any model is called.
 *
 * Reports EVERY violation, not the first. A user who fixes one field at a time
 * would otherwise pay seven model calls per attempt.
 */
export function g1ChargeSheet(caseObj) {
  const problems = [];

  if (!validateChargeSheet(caseObj)) {
    problems.push(...fmt(validateChargeSheet.errors));
  }

  // Below: the checks JSON Schema cannot express.

  if (typeof caseObj?.background === 'string') {
    const words = caseObj.background.trim().split(/\s+/).length;
    if (words < 200 || words > 400) {
      problems.push(
        `/background word count is ${words}; must be 200-400 (target 200-300)`,
      );
    }
  }

  const reps = caseObj?.representatives;
  if (Array.isArray(reps)) {
    const defense = reps.filter((r) => r?.seat === 'defense').length;
    const prosecution = reps.filter((r) => r?.seat === 'prosecution').length;
    if (defense !== 2 || prosecution !== 2) {
      problems.push(
        `/representatives seat balance is ${defense} defense / ${prosecution} prosecution; must be 2 / 2`,
      );
    }
    const ids = reps.map((r) => r?.id);
    if (new Set(ids).size !== ids.length) {
      problems.push('/representatives ids are not unique');
    }
  }

  return problems;
}

/**
 * G2 — the shape of one model response.
 * G3 — every cited fact index is within range for THIS case.
 * G2b — a judge answered at least one advocate from the seat it ruled against.
 * G6 — the disclaimer is present, and no sentencing or combining field exists.
 *
 * These run together because they all need the parsed response, and three of
 * them need the case to check against.
 */
export function g2OpinionEnvelope(opinion, caseObj) {
  const problems = [];

  // G6, checked BEFORE the schema. The schema also rejects these names, but it
  // does so through a `not/anyOf` clause whose error message is unreadable
  // ("must NOT be valid"). Checking here first means the log says which field
  // was forbidden — and it means a loosened schema does not silently loosen
  // the rule, since the schema is a file someone can edit.
  if (opinion?.role === 'judge') {
    for (const forbidden of [
      'sentence',
      'penalty',
      'punishment',
      'verdict',
      'majority',
      'consensus',
      'score',
      'confidence',
      'agrees_with',
    ]) {
      if (forbidden in opinion) {
        problems.push(
          `/${forbidden} is forbidden on a judge opinion (scope: no sentence, no combined result)`,
        );
      }
    }
  }

  if (!validateOpinion(opinion)) {
    problems.push(...fmt(validateOpinion.errors));
    // A response that fails the envelope cannot be meaningfully checked further.
    return problems;
  }

  // G3 — fact indices in range. The schema cannot express this: the bound is
  // a property of the case, not of the shape. This is the hallucination
  // detector; models invent citations.
  const n = caseObj?.agreed_facts?.length ?? 0;
  for (const i of opinion.relies_on_facts ?? []) {
    if (i >= n) {
      problems.push(
        `/relies_on_facts cites fact ${i}; this case has ${n} agreed facts (0-${n - 1})`,
      );
    }
  }

  const repIds = new Set((caseObj?.representatives ?? []).map((r) => r.id));

  if (opinion.role === 'advocate') {
    if (!repIds.has(opinion.representative_id)) {
      problems.push(
        `/representative_id "${opinion.representative_id}" is not a representative in this case`,
      );
    }
  }

  if (opinion.role === 'judge') {
    // G2b — the judge must answer somebody, and must answer at least one
    // advocate from the seat it ruled against. Answering only the side you
    // agreed with is not judging the case that was argued.
    const seatRuledAgainst =
      opinion.ruling === 'justified' ? 'prosecution' : 'defense';
    const seatOf = new Map(
      (caseObj?.representatives ?? []).map((r) => [r.id, r.seat]),
    );

    let answeredOpposed = false;
    for (const r of opinion.responds_to ?? []) {
      if (!repIds.has(r.representative_id)) {
        problems.push(
          `/responds_to answers "${r.representative_id}", who is not a representative in this case`,
        );
        continue;
      }
      if (seatOf.get(r.representative_id) === seatRuledAgainst) {
        answeredOpposed = true;
      }
    }
    if (!answeredOpposed) {
      problems.push(
        `/responds_to answers no advocate from the ${seatRuledAgainst} seat, which is the seat this ruling goes against`,
      );
    }

    // G6 compares the disclaimer, it does not merely check for one. A judge
    // paraphrased its own disclaimer in turn 003 — "does not impersonate the
    // judgement, does not represent personal views" — and a check for presence
    // passed it. This is a statement about named real people; it is not the
    // model's to reword, and it is now attached by the runner from
    // panel/judges.json rather than requested. This compares what was stored
    // against that single source, so a drift anywhere is caught.
    if (!opinion.disclaimer) {
      problems.push('/disclaimer is required on every judge opinion');
    } else if (opinion.disclaimer !== judgeDisclaimer()) {
      problems.push(
        '/disclaimer does not match panel/judges.json exactly. It is a statement ' +
          'about named real people and may not be reworded.',
      );
    }
  }

  return problems;
}

/**
 * G4 — the call budget. Exactly seven calls, and never more than the cap.
 * Six or eight is a failure, not a degraded success.
 */
export function g4CallBudget({ attempted, expected, cap }) {
  const problems = [];
  if (attempted > cap) {
    problems.push(`call cap exceeded: ${attempted} attempted, cap is ${cap}`);
  }
  if (attempted !== expected) {
    problems.push(`expected exactly ${expected} calls, ${attempted} were made`);
  }
  return problems;
}

/**
 * G7 — log completeness. One row per call attempted, including the failures.
 * The failure path is where logging gets forgotten, which is exactly where it
 * matters: without it, the failure rate is unknowable.
 */
export function g7LogCompleteness({ attempted, logged }) {
  return attempted === logged
    ? []
    : [`${attempted} calls attempted but ${logged} rows logged`];
}
