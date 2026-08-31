// Every test here asserts that a gate FAILS on something. A gate that has
// never caught anything counts as no gate at all, so the tests are written
// mostly from the failing side.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  g1ChargeSheet,
  g2OpinionEnvelope,
  g4CallBudget,
  g7LogCompleteness,
} from '../src/gates.js';
import { deliberate } from '../src/deliberate.js';
import { makeStubProvider } from '../src/providers/stub.js';
import { judgeUserMessage } from '../src/prompts.js';

const CASE = JSON.parse(
  fs.readFileSync('cases/T-001-realm-v-jon-snow.json', 'utf8'),
);
const clone = (o) => JSON.parse(JSON.stringify(o));

const goodJudge = {
  case_id: 'T-001',
  role: 'judge',
  model_id: 'stub',
  prompt_version: '1.0',
  prompt_sha256: 'a'.repeat(64),
  judge_id: 'barak_model',
  method: 'purposive, rights-centered, systemic',
  ruling: 'not_justified',
  grounds: ['G'.repeat(40), 'H'.repeat(40)],
  relies_on_facts: [0, 4],
  responds_to: [
    { representative_id: 'jon_snow', answer: 'A'.repeat(40) },
    { representative_id: 'grey_worm', answer: 'B'.repeat(40) },
  ],
  reasoning: 'R'.repeat(700),
  disclaimer: 'A judicial-method profile, not the judge.',
};

const goodAdvocate = {
  case_id: 'T-001',
  role: 'advocate',
  model_id: 'stub',
  prompt_version: '1.0',
  prompt_sha256: 'b'.repeat(64),
  representative_id: 'jon_snow',
  seat: 'defense',
  position: 'justified',
  relies_on_facts: [0, 1],
  key_points: ['K'.repeat(40)],
  argument: 'A'.repeat(500),
};

// ---------------------------------------------------------------- G1

test('G1 passes the instructor case', () => {
  assert.deepEqual(g1ChargeSheet(CASE), []);
});

test('G1 names a missing field rather than throwing', () => {
  const c = clone(CASE);
  delete c.issue;
  const p = g1ChargeSheet(c);
  assert.ok(p.some((x) => x.includes('issue')), p.join(' | '));
});

test('G1 rejects a case that tries to opt out of the non-combining rule', () => {
  const c = clone(CASE);
  c.scope.combines_opinions = true;
  assert.ok(g1ChargeSheet(c).length > 0);
});

test('G1 rejects a broken seat balance even with four representatives', () => {
  const c = clone(CASE);
  c.representatives[3].seat = 'defense'; // 3 / 1
  const p = g1ChargeSheet(c);
  assert.ok(p.some((x) => x.includes('seat balance')), p.join(' | '));
});

test('G1 rejects a background that is too short', () => {
  const c = clone(CASE);
  c.background = 'Too short. '.repeat(30); // ~60 words, and under the char floor
  const p = g1ChargeSheet(c);
  assert.ok(p.length > 0, 'expected a failure');
});

test('G1 reports every problem, not just the first', () => {
  const c = clone(CASE);
  delete c.issue;
  delete c.accused;
  assert.ok(g1ChargeSheet(c).length >= 2);
});

// ---------------------------------------------------------------- G2

test('G2 accepts a well-formed judge and advocate opinion', () => {
  assert.deepEqual(g2OpinionEnvelope(goodJudge, CASE), []);
  assert.deepEqual(g2OpinionEnvelope(goodAdvocate, CASE), []);
});

test('G2 rejects prose parsed as anything but the object', () => {
  const p = g2OpinionEnvelope({ case_id: 'T-001', role: 'judge' }, CASE);
  assert.ok(p.length > 0);
});

test('G2 rejects a judge that emits a verdict field', () => {
  const withVerdict = { ...goodJudge, verdict: 'guilty' }; // g5-ok: asserting the gate rejects it
  assert.ok(g2OpinionEnvelope(withVerdict, CASE).length);
});

test('G2 rejects a judge that imposes a sentence', () => {
  assert.ok(g2OpinionEnvelope({ ...goodJudge, sentence: 'exile' }, CASE).length);
});

test('G2 rejects a ruling outside the two permitted values', () => {
  assert.ok(
    g2OpinionEnvelope({ ...goodJudge, ruling: 'partly_justified' }, CASE).length,
  );
});

test('G2 rejects a missing disclaimer', () => {
  const { disclaimer, ...noDisclaimer } = goodJudge;
  assert.ok(g2OpinionEnvelope(noDisclaimer, CASE).length);
});

// ---------------------------------------------------------------- G2b

test('G2b rejects a judge that answers only the seat it ruled for', () => {
  const o = {
    ...goodJudge,
    ruling: 'not_justified', // seat ruled against is defense
    responds_to: [
      { representative_id: 'daenerys_targaryen', answer: 'A'.repeat(40) },
      { representative_id: 'grey_worm', answer: 'B'.repeat(40) },
    ],
  };
  const p = g2OpinionEnvelope(o, CASE);
  assert.ok(p.some((x) => x.includes('defense')), p.join(' | '));
});

test('G2b rejects an answer to somebody who is not in the case', () => {
  const o = {
    ...goodJudge,
    responds_to: [
      { representative_id: 'ser_davos', answer: 'A'.repeat(40) },
      { representative_id: 'jon_snow', answer: 'B'.repeat(40) },
    ],
  };
  assert.ok(g2OpinionEnvelope(o, CASE).some((x) => x.includes('ser_davos')));
});

// ---------------------------------------------------------------- G3

test('G3 catches an invented fact citation', () => {
  const p = g2OpinionEnvelope({ ...goodJudge, relies_on_facts: [0, 99] }, CASE);
  assert.ok(p.some((x) => x.includes('99')), p.join(' | '));
});

test('G3 allows the last valid index', () => {
  assert.deepEqual(
    g2OpinionEnvelope({ ...goodJudge, relies_on_facts: [4] }, CASE),
    [],
  );
});

// ---------------------------------------------------------------- the rule that must NOT exist

test('an advocate concluding against its own seat is valid — the simulation rule', () => {
  const against = { ...goodAdvocate, seat: 'defense', position: 'not_justified' };
  assert.deepEqual(
    g2OpinionEnvelope(against, CASE),
    [],
    'a gate is enforcing seat-position agreement; see decision 0004',
  );
});

// ---------------------------------------------------------------- G4 / G7

test('G4 fails on six calls and on eight', () => {
  assert.ok(g4CallBudget({ attempted: 6, expected: 7, cap: 10 }).length);
  assert.ok(g4CallBudget({ attempted: 8, expected: 7, cap: 10 }).length);
  assert.deepEqual(g4CallBudget({ attempted: 7, expected: 7, cap: 10 }), []);
});

test('G4 fails when the cap is exceeded', () => {
  assert.ok(g4CallBudget({ attempted: 11, expected: 7, cap: 10 }).length);
});

test('G7 fails when a call was not logged', () => {
  assert.ok(g7LogCompleteness({ attempted: 7, logged: 6 }).length);
  assert.deepEqual(g7LogCompleteness({ attempted: 7, logged: 7 }), []);
});

// ---------------------------------------------------------------- the protocol

test('all three judges receive byte-identical input', async () => {
  const provider = makeStubProvider('good');
  const r = await deliberate({ caseObj: CASE, provider });
  const a = judgeUserMessage(CASE, r.advocate_opinions);
  const b = judgeUserMessage(CASE, r.advocate_opinions);
  assert.equal(a, b);
  assert.ok(!a.includes('barak_model'), 'a judge prompt must not name another judge');
  assert.ok(!a.includes('RULING'), 'a judge must not see another judge ruling');
});

test('a full stub run makes exactly seven calls and logs seven rows', async () => {
  const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
  assert.equal(r.log.rows.length, 7);
  assert.equal(r.status, 'complete');
  assert.deepEqual(r.gate_problems, []);
});

test('a failed judge is logged and does not become an acquittal', async () => {
  const r = await deliberate({
    caseObj: CASE,
    provider: makeStubProvider('judgefail'),
  });
  assert.equal(r.status, 'partial');
  assert.equal(r.judge_opinions.length, 2);
  assert.equal(r.judge_failures.length, 1);
  assert.equal(r.log.rows.length, 7, 'the failed call must still be logged');
  assert.equal(r.log.rows.filter((x) => !x.succeeded).length, 1);
});

test('the result object holds no combined field anywhere', async () => {
  const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
  const json = JSON.stringify({ ...r, log: undefined });
  for (const forbidden of ['"verdict"', '"majority"', '"consensus"', '"score"']) {
    assert.ok(!json.includes(forbidden), `${forbidden} appeared in the result`);
  }
});
