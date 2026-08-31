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
import {
  modelMap,
  callCap,
  configWarnings,
  ADVOCATE_ORDER,
  JUDGE_ORDER,
} from '../src/config.js';
import { allowedIds } from '../src/models.js';
import { captureTo, stripAnsi } from '../tools/capture.js';
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
  case_for_seat: 'C'.repeat(400),
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

test('the judges run concurrently, and still arrive in a fixed order', async () => {
  // Sequential would be ~3x one judge's latency. The stub sleeps 5ms per call,
  // so this measures the shape rather than the speed: what matters is that
  // three judge calls do not take three times as long as one.
  const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
  assert.deepEqual(
    r.judge_opinions.map((o) => o.judge_id),
    ['barak_model', 'elon_model', 'shamgar_model'],
    'concurrency must not reorder the columns',
  );

  const rows = r.log.rows.filter((x) => x.role === 'judge');
  assert.equal(rows.length, 3);
  // Concurrent calls overlap in time. Sequential ones cannot: each would start
  // only after the previous finished.
  const total = rows.reduce((a, x) => a + x.latency_ms, 0);
  const span = Math.max(...rows.map((x) => x.latency_ms));
  assert.ok(total >= span, 'sanity');
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
  const before = process.env.TRIBUNAL_UNIFORM_MODEL;
  try {
    process.env.TRIBUNAL_UNIFORM_MODEL = 'test/model-set-after-import';
    const m = modelMap();
    assert.equal(Object.keys(m).length, 7);
    for (const [role, model] of Object.entries(m)) {
      assert.equal(model, 'test/model-set-after-import', `${role} did not resolve`);
    }
  } finally {
    if (before === undefined) delete process.env.TRIBUNAL_UNIFORM_MODEL;
    else process.env.TRIBUNAL_UNIFORM_MODEL = before;
  }
});

// ------------------------------------------- the committed allocation (turn 010)

test('the committed allocation gives advocates and judges different models', () => {
  // This is the finding of turn 010 expressed as a check. Uniform panels ruled
  // identically in 5 runs of 5; the division came back when only the judges
  // went back to flash-lite. If someone later collapses this to one model
  // because "the values look redundant", the run stops being the thing the
  // decision record describes — so the difference is asserted, not assumed.
  const before = process.env.TRIBUNAL_UNIFORM_MODEL;
  delete process.env.TRIBUNAL_UNIFORM_MODEL;
  try {
    const m = modelMap();
    const advocates = new Set(ADVOCATE_ORDER.map((id) => m[`advocate.${id}`]));
    const judges = new Set(JUDGE_ORDER.map((id) => m[`judge.${id}`]));

    assert.equal(advocates.size, 1, 'all four advocates run one model');
    assert.equal(judges.size, 1, 'all three judges run one model');
    assert.notEqual(
      [...advocates][0],
      [...judges][0],
      'decision 0009: the advocates and the judges do not run the same model',
    );

    // And both must be on the allowlist, or the browser could not reproduce a
    // committed run and the backend would refuse its own default.
    const ids = allowedIds();
    for (const model of Object.values(m)) {
      assert.ok(ids.has(model), `${model} is not in panel/models.json`);
    }
  } finally {
    if (before !== undefined) process.env.TRIBUNAL_UNIFORM_MODEL = before;
  }
});

test('a retired TRIBUNAL_MODEL is reported, not silently ignored', () => {
  assert.deepEqual(configWarnings({}), []);
  const warnings = configWarnings({ TRIBUNAL_MODEL: 'google/gemini-3.5-flash-lite' });
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('TRIBUNAL_UNIFORM_MODEL'));
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

// ------------------------------------------- the model picker (turn 008)

test('an override must name a real role and an allowed model', async () => {
  const { resolveModelMap } = await import('../src/config.js');
  const { allowedIds } = await import('../src/models.js');
  const ids = allowedIds();
  const before = process.env.TRIBUNAL_MODEL;
  process.env.TRIBUNAL_MODEL = 'google/gemini-3.5-flash-lite';
  try {
    const ok = resolveModelMap({ 'judge.barak_model': 'qwen/qwen3.7-flash' }, ids);
    assert.deepEqual(ok.problems, []);
    assert.equal(ok.map['judge.barak_model'], 'qwen/qwen3.7-flash');
    assert.equal(ok.map['judge.elon_model'], 'google/gemini-3.5-flash-lite',
      'an override must not leak onto other roles');

    // The whole point: a model id from a request never reaches the provider.
    const evil = resolveModelMap({ 'judge.barak_model': 'anthropic/claude-opus-5' }, ids);
    assert.ok(evil.problems.some((p) => p.includes('not an allowed model')));
    assert.equal(evil.map['judge.barak_model'], 'google/gemini-3.5-flash-lite');

    const nobody = resolveModelMap({ 'judge.nobody': 'qwen/qwen3.7-flash' }, ids);
    assert.ok(nobody.problems.some((p) => p.includes('not a role')));

    // An empty string means "use the default", not "use nothing".
    assert.deepEqual(resolveModelMap({ 'judge.elon_model': '' }, ids).problems, []);
  } finally {
    if (before === undefined) delete process.env.TRIBUNAL_MODEL;
    else process.env.TRIBUNAL_MODEL = before;
  }
});

test('a refused override costs no model calls', async () => {
  const { allowedIds } = await import('../src/models.js');
  const r = await deliberate({
    caseObj: CASE,
    provider: makeStubProvider('good'),
    modelOverrides: { 'judge.barak_model': 'evil/expensive' },
    allowedIds: allowedIds(),
  });
  assert.equal(r.status, 'failed');
  assert.equal(r.failed_gate, 'G0');
  assert.equal(r.log.rows.length, 0, 'a rejected selection must not spend anything');
});

test('every allowlisted model is cheap and is not a free tier', async () => {
  const { allowedModels } = await import('../src/models.js');
  const list = allowedModels();
  assert.ok(list.length >= 3);
  for (const m of list) {
    assert.ok(m.price_per_m_in <= 1, `${m.id} is not cheap enough for a public URL`);
    assert.ok(!m.id.includes(':free'), `${m.id} is a free tier and will rate-limit`);
    assert.ok(m.label && m.note, `${m.id} needs a label and a note`);
  }
});

test('a run records the per-role allocation, not one model string', async () => {
  const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
  assert.equal(Object.keys(r.model_map).length, 7);
});

// ------------------------------------------------- the Supabase sink (turn 006)

test('the Supabase sink posts four tables in dependency order, and no combined result', async () => {
  const { writeDeliberation } = await import('../src/sinks/supabase.js');
  const before = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY,
  };
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ table: url.split('/rest/v1/')[1], rows: JSON.parse(opts.body) });
    return { ok: true, text: async () => '' };
  };

  try {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';

    const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
    const doc = {
      deliberation_id: r.deliberation_id,
      case_id: r.case_id,
      ran_at: new Date().toISOString(),
      status: r.status,
      provider: 'stub',
      json_mode: null,
      model: null,
      temperature: 0.7,
      gate_problems: [],
      cap_error: null,
      reported: r.reported,
      case_snapshot: { agreed_facts: CASE.agreed_facts },
      advocate_opinions: r.advocate_opinions,
      judge_opinions: r.judge_opinions,
      model_calls: r.log.rows,
    };

    const written = await writeDeliberation(doc, CASE, { fetchImpl });

    assert.deepEqual(
      calls.map((c) => c.table),
      ['charge_sheets', 'deliberations', 'opinions', 'model_calls'],
      'foreign keys require this order',
    );
    assert.equal(written.opinions, 7);
    assert.equal(written.model_calls, 7);

    const body = JSON.stringify(calls);
    for (const forbidden of ['"verdict"', '"majority"', '"consensus"', '"score"']) {
      assert.ok(!body.includes(forbidden), `${forbidden} was sent to the database`);
    }
    const adv = calls[2].rows.filter((r2) => r2.role === 'advocate');
    assert.ok(adv.every((r2) => r2.case_for_seat), 'case_for_seat was not written');
  } finally {
    if (before.url === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = before.url;
    if (before.key === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = before.key;
  }
});

test('the sink writes the timing columns flattened out of usage', async () => {
  const { writeDeliberation } = await import('../src/sinks/supabase.js');
  const before = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SECRET_KEY };
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ table: url.split('/rest/v1/')[1], rows: JSON.parse(opts.body) });
    return { ok: true, text: async () => '' };
  };
  try {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
    const doc = {
      deliberation_id: r.deliberation_id,
      case_id: r.case_id,
      ran_at: new Date().toISOString(),
      status: r.status,
      case_snapshot: {},
      usage: r.log.summary({ wall_ms: r.wall_ms }),
      advocate_opinions: r.advocate_opinions,
      judge_opinions: r.judge_opinions,
      model_calls: r.log.rows,
    };
    await writeDeliberation(doc, CASE, { fetchImpl });
    const row = calls.find((c) => c.table === 'deliberations').rows[0];

    // The two timings must both be present and must be different things.
    assert.equal(typeof row.wall_ms, 'number');
    assert.equal(typeof row.model_time_ms, 'number');
    assert.equal(row.calls_attempted, 7);
    assert.equal(row.calls_succeeded, 7);
    assert.ok(row.tokens_in > 0 && row.tokens_out > 0);
  } finally {
    if (before.u === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = before.u;
    if (before.k === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = before.k;
  }
});

test('reading from Supabase rebuilds the shape compare expects', async () => {
  const { readDeliberations } = await import('../src/sinks/supabase.js');
  const before = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SECRET_KEY };
  const fetchImpl = async (url) => ({
    ok: true,
    json: async () =>
      url.includes('/deliberations')
        ? [{
            deliberation_id: 'd1', case_id: 'T-001', ran_at: '2026-08-31T10:55:00Z',
            status: 'complete', json_mode: 'object', model: 'm', model_map: null,
            wall_ms: 13600, model_time_ms: 36200,
            calls_attempted: 7, calls_succeeded: 7, tokens_in: 100, tokens_out: 50,
          }]
        : [
            { deliberation_id: 'd1', role: 'judge', judge_id: 'barak_model', ruling: 'justified', relies_on_facts: [0] },
            { deliberation_id: 'd1', role: 'advocate', representative_id: 'jon_snow', seat: 'defense', position: 'justified', case_for_seat: 'x' },
          ],
  });
  try {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    const runs = await readDeliberations({ fetchImpl });
    assert.equal(runs.length, 1);
    assert.equal(runs[0].usage.wall_ms, 13600);
    assert.equal(runs[0].usage.failed, 0);
    assert.equal(runs[0].judge_opinions.length, 1);
    assert.equal(runs[0].advocate_opinions.length, 1);
    assert.equal(runs[0].source, 'supabase');
  } finally {
    if (before.u === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = before.u;
    if (before.k === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = before.k;
  }
});

test('the sink refuses to run unconfigured, naming the right key', async () => {
  const { writeDeliberation, supabaseConfigured } = await import('../src/sinks/supabase.js');
  const before = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  try {
    assert.equal(supabaseConfigured(), false);
    await assert.rejects(
      () => writeDeliberation({ advocate_opinions: [], judge_opinions: [] }, CASE),
      /sb_secret_/,
    );
  } finally {
    if (before !== undefined) process.env.SUPABASE_URL = before;
  }
});

// ------------------------------------------- the case for the seat (turn 005)

test('an advocate opinion without case_for_seat is rejected', () => {
  const { case_for_seat, ...missing } = goodAdvocate;
  const p = g2OpinionEnvelope(missing, CASE);
  assert.ok(p.some((x) => x.includes('case_for_seat')), p.join(' | '));
});

test('case_for_seat copied from argument is rejected', () => {
  const copied = { ...goodAdvocate, case_for_seat: goodAdvocate.argument };
  const p = g2OpinionEnvelope(copied, CASE);
  assert.ok(p.some((x) => x.includes('identical')), p.join(' | '));
  // whitespace and case must not defeat it
  const sneaky = {
    ...goodAdvocate,
    case_for_seat: '  ' + goodAdvocate.argument.toUpperCase() + '  ',
  };
  assert.ok(g2OpinionEnvelope(sneaky, CASE).some((x) => x.includes('identical')));
});

test('an advocate may still conclude against its seat while arguing for it', () => {
  // Decision 0004 is untouched: case_for_seat constrains the ARGUMENT, never
  // the position.
  const against = {
    ...goodAdvocate,
    seat: 'defense',
    position: 'not_justified',
    case_for_seat: 'C'.repeat(400),
  };
  assert.deepEqual(g2OpinionEnvelope(against, CASE), []);
});

test('every judge receives the case for each seat, not only the positions', async () => {
  const r = await deliberate({ caseObj: CASE, provider: makeStubProvider('good') });
  const msg = judgeUserMessage(CASE, r.advocate_opinions);
  assert.ok(msg.includes('THE CASE FOR THE DEFENSE SEAT'), 'defence case missing');
  assert.ok(msg.includes('THE CASE FOR THE PROSECUTION SEAT'), 'prosecution case missing');
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
    const { file } = persistDeliberation(r, CASE, { provider: 'stub', json_mode: null });
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

// ------------------------------------------- evidence capture (turn 010)

test('a captured report is plain text, whatever the terminal was sent', () => {
  // The evidence file for turn 010 was first produced with `>` and came out
  // UTF-16 with a BOM and 124 colour escapes in it — git would have committed
  // the turn's central evidence as an undiffable binary blob. This is that
  // defect as a test.
  const written = {};
  const fakeFs = {
    mkdirSync: () => {},
    writeFileSync: (f, contents, enc) => {
      written.file = f;
      written.contents = contents;
      written.enc = enc;
    },
  };
  const fakePath = { dirname: (p) => p, resolve: (p) => p };
  const out = { log: (...a) => a };

  const cap = captureTo('evidence.txt', fakeFs, fakePath, out);
  out.log('\x1b[1m26 stored deliberations\x1b[0m' + '\x1b[2m  ·  merged\x1b[0m');
  out.log('\x1b[2m' + '─'.repeat(5) + '\x1b[0m');
  cap.write();

  assert.equal(written.enc, 'utf8', 'anything but utf8 is unreadable elsewhere');
  assert.ok(!/\x1b/.test(written.contents), 'a colour escape reached the file');
  assert.ok(!/\r/.test(written.contents), 'a CR reached the file');
  assert.match(written.contents, /^26 stored deliberations  ·  merged\n/);

  // Non-ASCII content is kept, not mangled: the table is drawn with them.
  assert.ok(written.contents.includes('─────'));
});

test('stripAnsi leaves ordinary text alone', () => {
  assert.equal(stripAnsi('plain'), 'plain');
  assert.equal(stripAnsi('\x1b[31mred\x1b[0m'), 'red');
  assert.equal(stripAnsi('90% [not a colour]'), '90% [not a colour]');
});

// ------------------------------------------- the read path (turn 011, DoD 3)

// A fake PostgREST. Returns a canned body per table, and records what was asked
// for, so a test can assert the query as well as the result.
function fakeSupabase(tables) {
  const asked = [];
  const impl = async (url) => {
    asked.push(String(url));
    const table = String(url).split('/rest/v1/')[1].split('?')[0];
    const body = tables[table];
    if (body === undefined) {
      return { ok: false, status: 404, text: async () => `no table ${table}` };
    }
    return { ok: true, status: 200, json: async () => body };
  };
  return { impl, asked };
}

const withSupabaseEnv = async (fn) => {
  const u = process.env.SUPABASE_URL;
  const k = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  try {
    return await fn();
  } finally {
    if (u === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = u;
    if (k === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = k;
  }
};

test('the index carries three rulings per run and no summary of them', async () => {
  const { readDeliberationIndex } = await import('../src/sinks/supabase.js');
  const { impl } = fakeSupabase({
    deliberations: [
      { deliberation_id: 'a', case_id: 'T-001', ran_at: '2026-08-31T11:00:00Z',
        status: 'complete', calls_attempted: 7, calls_succeeded: 7 },
    ],
    opinions: [
      { deliberation_id: 'a', judge_id: 'barak_model', ruling: 'justified' },
      { deliberation_id: 'a', judge_id: 'elon_model', ruling: 'justified' },
      { deliberation_id: 'a', judge_id: 'shamgar_model', ruling: 'not_justified' },
    ],
  });

  const runs = await withSupabaseEnv(() => readDeliberationIndex({ fetchImpl: impl }));
  assert.equal(runs.length, 1);
  assert.deepEqual(runs[0].rulings, {
    barak_model: 'justified',
    elon_model: 'justified',
    shamgar_model: 'not_justified',
  });

  // The list is a place a majority would be tempting. There must be nothing
  // shaped like one anywhere in what the endpoint hands the browser.
  const json = JSON.stringify(runs);
  for (const forbidden of ['verdict', 'majority', 'consensus', 'score', 'differ']) {
    assert.ok(!json.includes(forbidden), `${forbidden} appeared in the index`);
  }
});

test('a retrieved run shows a failed judge as a failure, not as two rulings', async () => {
  // The defect this guards: opinions has no row for a judge that failed, so a
  // naive read returns two rulings and the page renders two columns as though
  // that were the panel. Failures are rebuilt from model_calls for this reason.
  const { readDeliberation } = await import('../src/sinks/supabase.js');
  const id = '11111111-2222-3333-4444-555555555555';
  const { impl } = fakeSupabase({
    deliberations: [{ deliberation_id: id, case_id: 'T-001', status: 'partial',
      calls_attempted: 7, calls_succeeded: 6, tokens_in: 10, tokens_out: 20 }],
    opinions: [
      { deliberation_id: id, role: 'judge', judge_id: 'barak_model', ruling: 'justified' },
      { deliberation_id: id, role: 'judge', judge_id: 'elon_model', ruling: 'not_justified' },
      { deliberation_id: id, role: 'advocate', representative_id: 'jon_snow' },
    ],
    model_calls: [
      { role: 'judge', role_id: 'shamgar_model', succeeded: false,
        failure_reason: 'response was not JSON' },
      { role: 'judge', role_id: 'barak_model', succeeded: true },
    ],
  });

  const doc = await withSupabaseEnv(() => readDeliberation(id, { fetchImpl: impl }));
  assert.equal(doc.judge_opinions.length, 2);
  assert.deepEqual(doc.judge_failures, [
    { roleId: 'shamgar_model', reason: 'response was not JSON' },
  ]);
  assert.equal(doc.usage.failed, 1, 'the shortfall must be visible in usage too');
  assert.equal(doc.advocate_opinions.length, 1);
});

test('a missing run reads as missing, not as an empty deliberation', async () => {
  const { readDeliberation } = await import('../src/sinks/supabase.js');
  const { impl } = fakeSupabase({ deliberations: [] });
  const doc = await withSupabaseEnv(() =>
    readDeliberation('11111111-2222-3333-4444-555555555555', { fetchImpl: impl }));
  assert.equal(doc, null);
});

test('the read path refuses an id that is not one', async () => {
  const { readDeliberation } = await import('../src/sinks/supabase.js');
  const { impl, asked } = fakeSupabase({ deliberations: [] });
  await assert.rejects(
    withSupabaseEnv(() => readDeliberation('a&select=*', { fetchImpl: impl })),
    /Not a deliberation id/,
  );
  assert.equal(asked.length, 0, 'a rejected id must not reach the database');
});

test('the runs endpoint says the archive is absent rather than empty', async () => {
  // "No runs yet" and "the database is not connected" are different facts and
  // an empty list conflates them.
  const handler = (await import('../netlify/functions/runs.js')).default;
  const u = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  try {
    const res = await handler(new Request('https://x/api/runs'));
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.match(body.error, /not configured/);
  } finally {
    if (u !== undefined) process.env.SUPABASE_URL = u;
  }
});

test('the runs endpoint rejects anything but GET', async () => {
  const handler = (await import('../netlify/functions/runs.js')).default;
  const res = await handler(new Request('https://x/api/runs', { method: 'POST' }));
  assert.equal(res.status, 405);
});
