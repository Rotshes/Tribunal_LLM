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
import { modelMap, callCap } from '../src/config.js';
import { parseEnv } from '../src/env.js';
import { judgeDisclaimer } from '../src/panel.js';

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
  disclaimer: judgeDisclaimer(),
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

// ------------------------------------------- configuration read order (turn 003)

test('the model map reads the environment when called, not when imported', () => {
  // The first version of config.js built the map at import time. Imports are
  // evaluated before cli.js loads .env, so every entry was undefined and all
  // seven calls failed with "No model mapped". This test fails against that
  // version and passes against the fix.
  const before = process.env.TRIBUNAL_MODEL;
  try {
    process.env.TRIBUNAL_MODEL = 'test/model-set-after-import';
    const m = modelMap();
    assert.equal(Object.keys(m).length, 7);
    for (const [role, model] of Object.entries(m)) {
      assert.equal(model, 'test/model-set-after-import', `${role} did not resolve`);
    }
  } finally {
    if (before === undefined) delete process.env.TRIBUNAL_MODEL;
    else process.env.TRIBUNAL_MODEL = before;
  }
});

test('the call cap reads the environment when called', () => {
  const before = process.env.MAX_CALLS_PER_DELIBERATION;
  try {
    process.env.MAX_CALLS_PER_DELIBERATION = '3';
    assert.equal(callCap(), 3);
  } finally {
    if (before === undefined) delete process.env.MAX_CALLS_PER_DELIBERATION;
    else process.env.MAX_CALLS_PER_DELIBERATION = before;
  }
});

test('.env parsing survives Windows line endings, comments and quotes', () => {
  // Notepad writes CRLF. Splitting on "\n" leaves a carriage return on the end
  // of every value: a model slug that is not a slug, and an API key that 401s.
  // The key variable is named EXAMPLE_TOKEN rather than the real one on
  // purpose: G8 scans tracked files for the real key name followed by a value,
  // and flagged the first version of this test. That is the gate working.
  // Renaming the fixture is the fix; weakening G8 is not.
  const parsed = parseEnv(
    '# a comment\r\n' +
      'EXAMPLE_TOKEN=sk-or-v1-abc\r\n' +
      '\r\n' +
      'TRIBUNAL_MODEL="google/gemini-3.5-flash-lite"\r\n' +
      '  MAX_CALLS_PER_DELIBERATION = 10  \r\n' +
      '# SUPABASE_URL=ignored\r\n',
  );
  assert.equal(parsed.EXAMPLE_TOKEN, 'sk-or-v1-abc');
  assert.equal(parsed.TRIBUNAL_MODEL, 'google/gemini-3.5-flash-lite');
  assert.equal(parsed.MAX_CALLS_PER_DELIBERATION, '10');
  assert.equal(parsed.SUPABASE_URL, undefined);
  for (const v of Object.values(parsed)) {
    assert.ok(!/[\r\n]/.test(v), `value carries a line ending: ${JSON.stringify(v)}`);
  }
});

// ------------------------------------ identity is attached, not requested (turn 004)

test('the runner overwrites an identity the model fumbles', async () => {
  const r = await deliberate({
    caseObj: CASE,
    provider: makeStubProvider('fumbled_identity'),
  });

  // Real failure this reproduces: "daenerys_targator" and "daenerys_targatorn"
  // returned in two separate runs, each costing a whole call.
  assert.equal(r.status, 'complete', 'a fumbled id must no longer fail the call');

  const dany = r.advocate_opinions.find(
    (o) => o.representative_id === 'daenerys_targaryen',
  );
  assert.ok(dany, 'the misspelled id was not corrected');
  assert.equal(dany.seat, 'prosecution', 'the wrong seat was not corrected');

  const elon = r.judge_opinions.find((o) => o.judge_id === 'elon_model');
  assert.ok(elon, 'the misspelled judge id was not corrected');
  assert.equal(
    elon.disclaimer,
    judgeDisclaimer(),
    'a paraphrased disclaimer reached the stored opinion',
  );
});

test('G6 rejects a disclaimer that has been reworded', () => {
  const reworded = {
    ...goodJudge,
    disclaimer: judgeDisclaimer().replace('not the judge', 'not the judgement'),
  };
  const p = g2OpinionEnvelope(reworded, CASE);
  assert.ok(
    p.some((x) => x.includes('panel/judges.json')),
    p.join(' | '),
  );
});

test('a judge answer may run to 1200 characters', () => {
  // 600 was the bound until turn 004, where it discarded a whole judge opinion
  // over one long sentence.
  const long = {
    ...goodJudge,
    responds_to: [
      { representative_id: 'jon_snow', answer: 'A'.repeat(900) },
      { representative_id: 'grey_worm', answer: 'B'.repeat(40) },
    ],
  };
  assert.deepEqual(g2OpinionEnvelope(long, CASE), []);
  const tooLong = {
    ...goodJudge,
    responds_to: [
      { representative_id: 'jon_snow', answer: 'A'.repeat(1300) },
      { representative_id: 'grey_worm', answer: 'B'.repeat(40) },
    ],
  };
  assert.ok(g2OpinionEnvelope(tooLong, CASE).length);
});

test('a persisted deliberation stores the opinions and no combined field', async () => {
  const fsp = await import('node:fs');
  const os = await import('node:os');
  const pathmod = await import('node:path');
  const { persistDeliberation } = await import('../src/persist.js');

  const cwd = process.cwd();
  const tmp = fsp.mkdtempSync(pathmod.join(os.tmpdir(), 'tribunal-'));
  try {
    process.chdir(tmp);
    const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
    const file = persistDeliberation(r, CASE, { provider: 'stub', json_mode: null });
    const doc = JSON.parse(fsp.readFileSync(file, 'utf8'));

    assert.equal(doc.judge_opinions.length, 3);
    assert.equal(doc.advocate_opinions.length, 4);
    // The stored run must carry what produced it, or it cannot be compared.
    assert.ok('model' in doc && 'json_mode' in doc && 'temperature' in doc);
    // And the facts as they stood, so an index means the same thing later.
    assert.equal(doc.case_snapshot.agreed_facts.length, CASE.agreed_facts.length);

    const json = JSON.stringify(doc);
    for (const forbidden of ['"verdict"', '"majority"', '"consensus"', '"score"']) {
      assert.ok(!json.includes(forbidden), `${forbidden} appeared in a stored run`);
    }
  } finally {
    process.chdir(cwd);
    fsp.rmSync(tmp, { recursive: true, force: true });
  }
});

test('the result object holds no combined field anywhere', async () => {
  const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
  const json = JSON.stringify({ ...r, log: undefined });
  for (const forbidden of ['"verdict"', '"majority"', '"consensus"', '"score"']) {
    assert.ok(!json.includes(forbidden), `${forbidden} appeared in the result`);
  }
});
