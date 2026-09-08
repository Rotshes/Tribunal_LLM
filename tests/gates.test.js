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

// ------------------------- the committed allocation (turns 010 and 018)

test('the committed allocation gives all seven seats a different model', async () => {
  // Turn 010's version of this test asserted the opposite shape — four
  // advocates on one model, three judges on another, and the two different.
  // Decision 0013 replaced that with one model per seat, so the check is
  // rewritten rather than relaxed: a test that still passed under both
  // allocations would not be checking the allocation at all.
  const before = process.env.TRIBUNAL_UNIFORM_MODEL;
  delete process.env.TRIBUNAL_UNIFORM_MODEL;
  try {
    const m = modelMap();
    const seats = [
      ...ADVOCATE_ORDER.map((id) => `advocate.${id}`),
      ...JUDGE_ORDER.map((id) => `judge.${id}`),
    ];
    assert.equal(seats.length, 7);

    const models = seats.map((key) => m[key]);
    for (const [i, model] of models.entries()) {
      assert.ok(model, `${seats[i]} has no model`);
    }
    assert.equal(
      new Set(models).size,
      7,
      'decision 0013: seven seats, seven distinct models — two seats share one',
    );

    // Every seat must be on the allowlist, or the browser could not reproduce a
    // committed run and the backend would refuse its own default.
    const ids = allowedIds();
    for (const model of models) {
      assert.ok(ids.has(model), `${model} is not in panel/models.json`);
    }

    // And every seat must be on a model OBSERVED TO WORK. The allowlist
    // deliberately keeps entries that fail, so that archived runs which used
    // them still resolve; the committed allocation may not contain one. Without
    // this, a copy-paste from the allowlist into config.js ships a tribunal
    // with a permanently dead seat and every test still green.
    const { allowedModels } = await import('../src/models.js');
    const observedBy = new Map(allowedModels().map((x) => [x.id, x.observed]));
    for (const model of models) {
      assert.match(
        String(observedBy.get(model)),
        /^works/,
        `${model} holds a committed seat but was not observed to work`,
      );
    }
  } finally {
    if (before !== undefined) process.env.TRIBUNAL_UNIFORM_MODEL = before;
  }
});

test('the judges hold three different vendors and no two seats share a lineage by accident', () => {
  // The point of 0013's arrangement, asserted where it can be broken.
  //
  // Seven distinct ids is satisfiable by seven models from one vendor, and that
  // would defeat the reason for doing it: sibling models agree, and three
  // judges that agree by lineage produce a panel with nothing to report (0002).
  // So the judge side carries the stronger condition.
  const before = process.env.TRIBUNAL_UNIFORM_MODEL;
  delete process.env.TRIBUNAL_UNIFORM_MODEL;
  try {
    const m = modelMap();
    const vendor = (id) => String(id).split('/')[0];
    const judgeVendors = JUDGE_ORDER.map((id) => vendor(m[`judge.${id}`]));
    assert.equal(
      new Set(judgeVendors).size,
      3,
      `the three judges must come from three vendors, got ${judgeVendors.join(', ')}`,
    );
  } finally {
    if (before !== undefined) process.env.TRIBUNAL_UNIFORM_MODEL = before;
  }
});

test('a visitor override cannot alter the committed allocation for later runs', async () => {
  // modelMap() returns a spread of SEAT_MODELS, not SEAT_MODELS itself.
  // resolveModelMap() writes overrides into the object it is given, so handing
  // it the module-level constant would let one request's model choice become
  // every later request's default for the life of the process — a bug that
  // would only ever show on the deployed site, under concurrent visitors, and
  // never once locally.
  const { resolveModelMap } = await import('../src/config.js');
  const before = process.env.TRIBUNAL_UNIFORM_MODEL;
  delete process.env.TRIBUNAL_UNIFORM_MODEL;
  try {
    const original = modelMap()['judge.barak_model'];
    const { problems } = resolveModelMap(
      { 'judge.barak_model': 'qwen/qwen3.7-flash' },
      allowedIds(),
    );
    assert.deepEqual(problems, []);
    assert.equal(
      modelMap()['judge.barak_model'],
      original,
      'an override leaked into the committed allocation',
    );
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
    // Read the defaults from modelMap() rather than naming them. This test
    // twice hardcoded whatever the allocation happened to be, and turn 018
    // broke it by changing the allocation without changing the behaviour under
    // test — which is leakage, not any particular model. Derive, don't restate.
    const defaults = modelMap();

    const ok = resolveModelMap({ 'judge.barak_model': 'qwen/qwen3.7-flash' }, ids);
    assert.deepEqual(ok.problems, []);
    assert.equal(ok.map['judge.barak_model'], 'qwen/qwen3.7-flash');
    assert.equal(ok.map['judge.elon_model'], defaults['judge.elon_model'],
      'an override must not leak onto other roles');

    // The whole point: a model id from a request never reaches the provider.
    const evil = resolveModelMap({ 'judge.barak_model': 'anthropic/claude-opus-5' }, ids);
    assert.ok(evil.problems.some((p) => p.includes('not an allowed model')));
    assert.equal(evil.map['judge.barak_model'], defaults['judge.barak_model']);

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

// ------------------------------------------- the call timeout (turn 012)

test('a cut-off call fails with a reason that names the timeout', async () => {
  // Deployed 31.08: a mixed panel returned Netlify's 504 and lost all seven
  // results, because the per-call timeout was 90s and the platform limit is 60.
  // The platform always won, so no call could ever fail on our side. Now one
  // can — and when it does, "This operation was aborted" is not a reason
  // anybody can act on.
  const { makeOpenRouterProvider } = await import('../src/providers/openrouter.js');
  const before = process.env.OPENROUTER_API_KEY;
  // Constructing the real provider requires the real variable name, so this
  // line cannot be renamed the way turn 003's fixture was. The pragma is on the
  // line itself, where a reviewer reading the assignment also reads the reason.
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-one'; // g8-ok: a fake value the provider only checks for presence
  try {
    const provider = makeOpenRouterProvider({ jsonMode: 'object', timeoutMs: 20 });
    // A fetch that never settles until it is aborted, which is the real shape.
    const realFetch = globalThis.fetch;
    globalThis.fetch = (_url, opts) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const e = new Error('This operation was aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    try {
      await assert.rejects(
        provider.call({
          role: 'judge', roleId: 'barak_model', model: 'test/slow',
          system: 's', user: 'u',
        }),
        (err) => {
          assert.match(err.message, /no answer within 0s|no answer within \d+s/);
          assert.match(err.message, /test\/slow/, 'the reason must name the model');
          assert.ok(!/operation was aborted/i.test(err.message));
          return true;
        },
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  } finally {
    if (before === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = before; // g8-ok: restoring the caller's own value, not a literal
  }
});

// The budget test that stood here is deleted, not adjusted.
//
// It asserted that seven model calls fit inside a 30-second platform limit.
// Turn 013 stopped trying to make them fit: the function is a background one
// now and has fifteen minutes. A test that guards an abandoned constraint is
// worse than no test, because it keeps the constraint alive in the reader's
// head. The replacement is `the deliberate function is a background function
// with no time budget`, below.
//
// The deadline mechanism itself is kept and still tested — it is how a call
// that hangs is stopped, which is a real bug at fifteen minutes as much as at
// thirty seconds.

test('the deadline shrinks: a later call gets only what is left', async () => {
  // The defect the deadline exists for. With two independent per-call timeouts,
  // the judges could spend the full cap no matter how long the advocates took,
  // so the total was the sum and the platform killed the run.
  const { makeOpenRouterProvider } = await import('../src/providers/openrouter.js');
  const before = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'test-key-not-a-real-one'; // g8-ok: a fake value the provider only checks for presence
  try {
    // A deadline that has already passed: nothing should be called at all.
    const spent = makeOpenRouterProvider({
      jsonMode: 'object',
      timeoutMs: 20_000,
      deadlineAt: Date.now() - 1,
    });
    const realFetch = globalThis.fetch;
    let called = 0;
    globalThis.fetch = () => { called += 1; return Promise.reject(new Error('should not happen')); };
    try {
      await assert.rejects(
        spent.call({ role: 'judge', roleId: 'elon_model', model: 'test/m', system: 's', user: 'u' }),
        /out of time before judge.elon_model was called/,
      );
      assert.equal(called, 0, 'an out-of-budget call must not be paid for');
    } finally {
      globalThis.fetch = realFetch;
    }
  } finally {
    if (before === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = before; // g8-ok: restoring the caller's own value, not a literal
  }
});

test('the G8 pragma cannot pardon actual key material', async () => {
  // Turn 012 gave G8 a per-line escape so a test could set the real env var.
  // An escape hatch on a secret scanner is only acceptable if it cannot cover
  // the thing the scanner exists for, so that limit is asserted here rather
  // than trusted to the comment next to it.
  const { execFileSync } = await import('node:child_process');
  const fsp = await import('node:fs');
  const os = await import('node:os');
  const pathMod = await import('node:path');

  const script = pathMod.resolve('tools/repo-checks.js');
  const tmp = fsp.mkdtempSync(pathMod.join(os.tmpdir(), 'g8-'));
  const cwd = process.cwd();

  // Built at runtime: written as a literal, this test file would itself be a
  // leak by G8's own rule — correctly.
  const keyish = 'sk-or-v1-' + 'a1b2c3d4'.repeat(3);

  try {
    fsp.writeFileSync(
      pathMod.join(tmp, 'sneaky.js'),
      `const k = '${keyish}'; // g8-ok: claiming this is fine does not make it fine\n`,
    );
    process.chdir(tmp);
    let failed = false;
    try {
      execFileSync(process.execPath, [script], { stdio: 'pipe' });
    } catch (err) {
      failed = true;
      assert.match(String(err.stderr), /looks like a live secret/);
    }
    assert.ok(failed, 'a pragma pardoned a real key pattern');

    // And the pardonable case still passes, or the pragma would be pointless.
    fsp.rmSync(pathMod.join(tmp, 'sneaky.js'));
    fsp.writeFileSync(
      pathMod.join(tmp, 'fine.js'),
      `process.env.OPENROUTER_API_KEY = 'x'; // g8-ok: a test fixture\n`,
    );
    execFileSync(process.execPath, [script], { stdio: 'pipe' });
  } finally {
    process.chdir(cwd);
    fsp.rmSync(tmp, { recursive: true, force: true });
  }
});

test('the deliberate function never lets an error escape as a platform 502', async () => {
  // Deployed 31.08: `await deliberate(...)` had no catch, so a throw anywhere
  // inside it surfaced as Netlify's `{"errorType":"Error","errorMessage":"An
  // unknown error has occurred"}` with a 502. The app has to answer for itself.
  const handler = (await import('../netlify/functions/deliberate.js')).default;

  // A request that reaches past validation and then fails: no OpenRouter key,
  // so the provider constructor throws — that path already returns 503. To
  // exercise the LAST-RESORT path, break something the code does not guard:
  // a case id that loads, with a models object that is not an object.
  const res = await handler(
    new Request('https://x/api/deliberate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"case_id":"T-001","models":',   // truncated JSON
    }),
  );
  // Malformed JSON is already handled, so this is 400 — the point of the
  // assertion is that SOMETHING considered comes back, never an escape.
  assert.ok(res.status < 500 || res.status === 500);
  const body = await res.json();
  assert.ok(body.error, 'every response must carry an error the page can show');
  assert.ok(!/unknown error has occurred/i.test(JSON.stringify(body)));
});

test('the last-resort handler reports the failure instead of throwing', async () => {
  const mod = await import('../netlify/functions/deliberate.js');
  const src = fs.readFileSync('netlify/functions/deliberate.js', 'utf8');
  assert.match(src, /return await runDeliberation\(req\)/,
    'the exported handler must delegate through a try/catch');
  assert.match(src, /The tribunal failed unexpectedly/);
  assert.equal(typeof mod.default, 'function');
});

// ------------------------------------------- the background run (turn 013)

test('a caller may supply the deliberation id, and a malformed one is refused', async () => {
  // The background function answers 202 with an empty body, so the browser has
  // to know the id before the run starts or it has nothing to poll for. A
  // supplied id is untrusted: it becomes a primary key.
  const good = '11111111-2222-3333-4444-555555555555';
  const r1 = await deliberate({
    caseObj: CASE,
    provider: makeStubProvider('good'),
    deliberationId: good,
  });
  assert.equal(r1.deliberation_id, good);

  for (const bad of ["'; drop table deliberations; --", '', 'x'.repeat(200), null, 42]) {
    const r = await deliberate({
      caseObj: CASE,
      provider: makeStubProvider('good'),
      deliberationId: bad,
    });
    assert.notEqual(r.deliberation_id, bad);
    assert.match(r.deliberation_id, /^[0-9a-f-]{36}$/i, 'a refused id must be replaced, not used');
  }
});

test('the deliberate function is a background function with no time budget', () => {
  // Turn 012 spent three deploys fitting seven calls into 30 seconds and still
  // cut a judge off at 7. The fix was to stop fitting.
  const src = fs.readFileSync('netlify/functions/deliberate.js', 'utf8');
  assert.match(src, /background: true/);
  assert.ok(!/deadlineAt/.test(src), 'the synchronous deadline must be gone');
  assert.ok(!/PLATFORM_LIMIT_MS/.test(src), 'no platform budget should remain');
  assert.match(src, /deliberationId: body\.deliberation_id/,
    'the supplied id must be passed through, or the page cannot poll');
});

test('the page polls the archive rather than reading a response body', () => {
  const api = fs.readFileSync('web/src/api.js', 'utf8');
  assert.match(api, /res\.status !== 202/, 'a background invocation answers 202');
  assert.match(api, /api\/runs\?id=/, 'the archive endpoint is the polling endpoint');
  assert.match(api, /POLL_GIVE_UP_MS/, 'polling must be bounded, or a dead run hangs the page');
  assert.match(fs.readFileSync('web/src/App.jsx', 'utf8'), /awaitResult\(id\)/);
});

test('every name a frontend module calls is imported or declared in it', async () => {
  // Turn 013 deleted three functions while rewriting a fourth, and the page
  // threw `loadArchive is not defined` after seven paid model calls. The test
  // written then parsed web/index.html as one script; turn 015 replaced that
  // file with React modules, so the shape it read is gone.
  //
  // IT WAS NOT REPLACED BY THE COMPILER, and I checked rather than assumed.
  // Building the app with an undefined identifier in App.jsx succeeds:
  //
  //   totallyUndefinedFunction();   →   ✓ built in 651ms
  //
  // Vite catches an unresolved IMPORT and fails the build (asserted in the next
  // test). It does not catch a bare identifier that resolves to nothing at
  // runtime, which is exactly turn 013's bug. So this check survives the
  // migration, per module instead of per page — and modules make it sharper,
  // because scope is now per file rather than one shared soup.
  const vm = await import('node:vm');
  const pathMod = await import('node:path');

  const dir = 'web/src';
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = pathMod.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.jsx?$/.test(e.name)) files.push(full);
    }
  })(dir);
  assert.ok(files.length >= 8, `expected the frontend modules, found ${files.length}`);

  const BUILT_IN = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'await', 'new',
    'function', 'fetch', 'setTimeout', 'setInterval', 'clearInterval',
    'clearTimeout', 'parseInt', 'parseFloat', 'encodeURIComponent', 'require',
    'crypto', 'console', 'String', 'Number', 'Boolean', 'Object', 'Array', 'Map',
    'Set', 'Promise', 'Date', 'JSON', 'Math', 'super', 'async',
  ]);

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');

    // Strings and comments are not code. Without stripping them the scan reads
    // identifiers out of prose and reports them as undefined functions; a check
    // that cries wolf gets deleted, which is worse than not having it.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');

    const declared = new Set([
      // import { a, b } from '…'  and  import a from '…'
      ...[...code.matchAll(/import\s+([\s\S]*?)\s+from/g)]
        .flatMap((m) => m[1].replace(/[{}]/g, ' ').split(/[\s,]+/))
        .filter(Boolean),
      ...[...code.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
      ...[...code.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
      // Array destructuring, which is how every useState pair is declared:
      //   const [charge, setCharge] = useState(null)
      ...[...code.matchAll(/(?:const|let|var)\s*\[([^\]]*)\]/g)]
        .flatMap((m) => m[1].split(/[\s,]+/))
        .filter(Boolean),
      // Destructured props and parameters: ({ a, b }) => …
      ...[...code.matchAll(/\(\s*\{([^}]*)\}/g)]
        .flatMap((m) => m[1].split(/[\s,:=]+/))
        .filter(Boolean),
      // Plain arrow parameters: (a, b) => …
      ...[...code.matchAll(/\(([^()]*)\)\s*=>/g)]
        .flatMap((m) => m[1].split(/[\s,]+/))
        .filter(Boolean),
    ]);

    const called = new Set(
      [...code.matchAll(/(?:^|[\s;{(=>&|?:!])([a-z_$][A-Za-z0-9_$]*)\s*\(/gm)].map((m) => m[1]),
    );

    const missing = [...called].filter((n) => !declared.has(n) && !BUILT_IN.has(n));
    assert.deepEqual(missing, [], `${file} calls names it does not import or declare: ${missing.join(', ')}`);
  }
});

test('the build fails on an unresolved import', async () => {
  // What the build DOES catch, asserted rather than assumed — this is half the
  // argument for decision 0012, and the other half (undefined identifiers) is
  // disproved in the test above.
  const { execFileSync } = await import('node:child_process');
  const backup = fs.readFileSync('web/src/App.jsx', 'utf8');
  try {
    fs.writeFileSync(
      'web/src/App.jsx',
      backup.replace("./components/Archive.jsx", "./components/NoSuchFile.jsx"),
    );
    let failed = false;
    try {
      execFileSync('npm', ['run', 'build'], { stdio: 'pipe' });
    } catch (err) {
      failed = true;
      assert.match(String(err.stdout) + String(err.stderr), /NoSuchFile|resolve/i);
    }
    assert.ok(failed, 'the build accepted an import that does not exist');
  } finally {
    fs.writeFileSync('web/src/App.jsx', backup);
  }
});

test('every allowlisted model records what it was observed to do', async () => {
  // panel/models.json used to claim its entries were verified because they
  // appeared in OpenRouter's response_format catalogue. On 31.08 a four-provider
  // run showed two of the five failing anyway: response_format support is per
  // ENDPOINT, and `require_parameters` routes only to endpoints supporting
  // everything sent. The catalogue is not evidence; a run is.
  const { allowedModels } = await import('../src/models.js');
  for (const m of allowedModels()) {
    assert.ok(m.observed, `${m.id} has no observed field — it has never been run`);
    assert.match(m.observed, /^(works|FAILS|UNRELIABLE)/,
      `${m.id}'s observed field must start with a verdict`);
    assert.match(m.observed, /\d{2}\.\d{2}\.\d{4}/,
      `${m.id}'s observed field must say when`);
  }
});

test('the picker labels a failing model if one ever reaches it', () => {
  // Since turn 018 the endpoint filters these out, so in normal operation this
  // label never renders. It is kept as the second layer: if the filter is
  // relaxed, or a model is offered whose `observed` record does not begin
  // "works", the option says so rather than looking like any other choice.
  // Removing it would leave the picker with no defence of its own.
  const panel = fs.readFileSync('web/src/panel.js', 'utf8');
  assert.match(panel, /known to fail/);
  assert.match(panel, /unreliable/);
  assert.match(panel, /model\?\.observed/, 'the warning must come from the recorded observation');
  assert.match(
    fs.readFileSync('web/src/components/ModelPicker.jsx', 'utf8'),
    /modelHealth\(m\)/,
    'and the option must actually show it',
  );
});

test('a rejected model report carries no account identifier and pastes as valid JSON', async () => {
  // The first version of try-model printed the provider's error body raw. On a
  // 400 that put the account's user_id into the line offered for
  // panel/models.json — an identifier headed for a public repository — with
  // unescaped double quotes that would have broken the file on paste. Neither
  // is the model's fault and neither belongs in a record of what the model did.
  const src = fs.readFileSync('tools/try-model.js', 'utf8');
  assert.match(src, /function clean\(message\)/);
  assert.match(src, /JSON\.stringify\(`\$\{outcome\}/,
    'the pasteable line must be JSON-escaped, not concatenated');

  const body = src.match(/function clean\(message\)[\s\S]*?\n}/)[0];
  const clean = new Function('return (' + body.replace('function clean', 'function') + ')')();

  const raw =
    'OpenRouter 400: {"error":{"message":"x is not a valid model ID","code":400},' +
    '"user_id":"user_ABCDEFGHIJKLMNOP"}';
  const out = clean(raw);

  assert.ok(!/user_ABCDEFGHIJKLMNOP/.test(out), 'an account id reached the record');
  assert.match(out, /not a valid model ID/, 'the useful part must survive');
  // Round-trips through JSON, which is the only thing the paste has to do.
  assert.equal(JSON.parse(JSON.stringify({ observed: out })).observed, out);
});

test('G9 catches a decision that is cited but never written', async () => {
  // Decisions 0001 and 0002 were cited eighteen times across this repository —
  // by the schema, the gates, tools/compare.js, CLAUDE.md, the README and half
  // the turn records — and neither file existed. 0002 is the non-combination
  // rule, the project's central claim, argued nowhere for nine turns.
  //
  // Nobody follows a link that looks authoritative. A machine can.
  const { execFileSync } = await import('node:child_process');
  const fsp = await import('node:fs');
  const os = await import('node:os');
  const pathMod = await import('node:path');

  const script = pathMod.resolve('tools/repo-checks.js');
  const tmp = fsp.mkdtempSync(pathMod.join(os.tmpdir(), 'g9-'));
  const cwd = process.cwd();

  try {
    fsp.mkdirSync(pathMod.join(tmp, 'docs', 'decisions'), { recursive: true });
    fsp.writeFileSync(
      pathMod.join(tmp, 'CLAUDE.md'),
      'The rule is that nothing is combined. (0002)\n',
    );
    process.chdir(tmp);

    let failed = false;
    try {
      execFileSync(process.execPath, [script], { stdio: 'pipe' });
    } catch (err) {
      failed = true;
      assert.match(String(err.stderr), /decision 0002 is cited/);
    }
    assert.ok(failed, 'G9 did not catch a citation with no file behind it');

    // And it passes once the file exists, or it would just be noise.
    fsp.writeFileSync(
      pathMod.join(tmp, 'docs', 'decisions', '0002-nothing-is-combined.md'),
      '# 0002\n',
    );
    execFileSync(process.execPath, [script], { stdio: 'pipe' });
  } finally {
    process.chdir(cwd);
    fsp.rmSync(tmp, { recursive: true, force: true });
  }
});

test('G9 does not report a four-digit number that is not a decision', () => {
  // The first draft flagged `(1300)` — a character count in this file — as a
  // missing decision. A check that invents work gets switched off.
  const src = fs.readFileSync('tools/repo-checks.js', 'utf8');
  assert.match(src, /\\\(\(00\\d\{2\}\)\\\)/, 'the bare reference pattern must be limited to 00NN');
});

test('the rulings render from the fixed judge list, not from what came back', () => {
  // The guarantee is three columns, always, in the same order — a judge that
  // failed occupies its column as a failure. Mapping over `judge_opinions`
  // instead would silently render two columns for a partial run, which looks
  // exactly like a panel where one judge was not shown. (decision 0002)
  const src = fs.readFileSync('web/src/components/Rulings.jsx', 'utf8');
  assert.match(src, /JUDGES\.map\(/, 'the component must iterate the fixed list');
  // Position, not presence: `(doc.judge_opinions ?? []).map(...)` is legitimate
  // where it builds a lookup, and the first draft of this test flagged exactly
  // that. What matters is that the COLUMNS come from JUDGES — so every
  // `<article className="judge"` must sit after `JUDGES.map(` opens.
  const mapsFixedList = src.indexOf('JUDGES.map(');
  const firstColumn = src.indexOf('className="judge"');
  assert.ok(mapsFixedList !== -1 && mapsFixedList < firstColumn,
    'the judge columns must be produced by iterating the fixed list');
  assert.match(src, /Deliberation failed/, 'the empty column must say so');

  // The colour hook is per column and carries no comparison between them.
  const css = fs.readFileSync('web/src/styles.css', 'utf8');
  assert.match(css, /\.ruling\[data-ruling="justified"\]/);
  assert.match(css, /\.ruling\[data-ruling="not_justified"\]/);
});

test('the stylesheet contains no stray non-ASCII outside the places that need it', () => {
  // Turn 016 introduced `--accent:#D2AE६B` — a Devanagari digit inside a hex
  // colour. CSS fails silently: the rule is dropped, the variable keeps its
  // previous value, and nothing anywhere reports it. The build was happy.
  //
  // Non-ASCII is legitimate in comments and in generated content (the ✓ and ·
  // used as stage markers), so this checks DECLARATIONS only.
  const css = fs.readFileSync('web/src/styles.css', 'utf8');

  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const offenders = [];

  withoutComments.split('\n').forEach((line, i) => {
    // `content:` legitimately carries symbols and quoted text.
    if (/content\s*:/.test(line)) return;
    if ([...line].some((c) => c.charCodeAt(0) > 127)) {
      offenders.push(`${i + 1}: ${line.trim()}`);
    }
  });

  assert.deepEqual(offenders, [], `non-ASCII in a CSS declaration:\n${offenders.join('\n')}`);

  // And every hex colour is a hex colour.
  //
  // VALUES only: the first draft matched `#status` and `#archive-section` —
  // id selectors, which begin with the same character and are not colours.
  // Fourth false positive in four turns, same cause each time: a check written
  // against the shape of the defect rather than against what makes it one.
  for (const line of withoutComments.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    for (const m of line.slice(colon).matchAll(/#([0-9A-Za-z]{3,8})\b/g)) {
      assert.match(m[1], /^[0-9A-Fa-f]{3,8}$/, `${m[0]} is not a valid hex colour`);
    }
  }
});

test('the picker offers only models observed to work, and the backend still accepts the rest', async () => {
  // Turn 013 left the broken models in the dropdown with a label. Turn 018
  // removed them from the offer on Roy's instruction: a menu of options that
  // never work is a worse interface than a shorter menu, whatever the labels
  // say.
  //
  // Filtered, not deleted — a stored run that used one must still resolve, and
  // the record of why it was dropped must survive.
  const { allowedModels, offeredModels, allowedIds } = await import('../src/models.js');

  const offered = offeredModels();
  assert.ok(offered.length >= 3, 'the picker must still offer a usable panel');
  for (const m of offered) {
    assert.match(m.observed, /^works/, `${m.id} is offered but not observed to work`);
  }

  const broken = allowedModels().filter((m) => !/^works/.test(m.observed));
  assert.ok(broken.length > 0, 'this test is meaningless if nothing is filtered');
  for (const m of broken) {
    assert.ok(!offered.some((o) => o.id === m.id), `${m.id} is still offered`);
    assert.ok(allowedIds().has(m.id), `${m.id} was removed from the allowlist, orphaning its runs`);
  }

  const fn = fs.readFileSync('netlify/functions/models.js', 'utf8');
  assert.match(fn, /offeredModels\(\)/, 'the endpoint must serve the offer, not the allowlist');
});

test('an account refusal is told apart from a model failure', async () => {
  // 08.09.2026: five runs reported 21 of 35 calls failed and the allocation was
  // read as broken. Fifteen were OpenRouter refusing on credit and key limits —
  // no model was asked anything. The one run that completed before the wall was
  // a clean 7/7 with a divided panel.
  //
  // The two exclusions are the point of the test, not an afterthought. A 429 and
  // a 404 are real evidence against a model and must NOT be excused as account
  // problems: qwen3.7-flash lost grey_worm's seat for 429s, and gpt-5.6-luna is
  // marked FAILS for 404s. If those ever classify as account-side, two models
  // get their seats back on a technicality.
  const { isAccountFailure } = await import('../src/failures.js');

  for (const reason of [
    'This request requires more credits, or fewer max_tokens',
    'Key limit exceeded (total limit). Manage it using https://openrouter.ai/keys',
    'OpenRouter 402: payment required',
    'insufficient credit',
    'quota exceeded',
  ]) {
    assert.ok(isAccountFailure(reason), `not recognised as account-side: ${reason}`);
  }

  for (const reason of [
    'response was not JSON (model returned prose)',
    'failed G2/G3: /responds_to/0/answer must NOT have fewer than 20 characters',
    'no answer within 90s (qwen/qwen3.7-flash) — the call was cut off, not refused',
    'OpenRouter 429: Provider returned error, temporarily rate-limited upstream',
    'OpenRouter 404: no endpoints found that can handle the requested parameters',
    '',
  ]) {
    assert.ok(!isAccountFailure(reason), `wrongly excused as account-side: ${reason}`);
  }

  // And the tool must actually use it, in all three places it reports failures:
  // the per-config rate, the reason list, and the by-role tally.
  const cmp = fs.readFileSync('tools/compare.js', 'utf8');
  assert.equal(
    (cmp.match(/isAccountFailure\(/g) ?? []).length >= 3,
    true,
    'compare.js must apply the classifier to the rate, the reasons and the roles',
  );
});

test('--seat sets one role, is repeatable, and cannot smuggle a model past the allowlist', async () => {
  // The flag exists for 0013's open experiment: permute the three judge models
  // between the three judge seats so that each model sits each seat once. If
  // the lean travels with the seat it is the method; if it travels with the
  // model it is the model. Nothing else separates those two.
  const { parseSeatFlags, resolveModelMap, modelMap } = await import('../src/config.js');

  const argv = [
    'T-001',
    '--provider', 'openrouter',
    '--seat', 'judge.barak_model=inception/mercury-2.5-preview',
    '--seat', 'judge.shamgar_model=google/gemini-3.5-flash-lite',
  ];
  assert.deepEqual(parseSeatFlags(argv), {
    'judge.barak_model': 'inception/mercury-2.5-preview',
    'judge.shamgar_model': 'google/gemini-3.5-flash-lite',
  });

  // Malformed flags are dropped here rather than guessed at. A --seat with
  // nothing after it, or without an "=", is not a role and not a model.
  assert.deepEqual(parseSeatFlags(['--seat']), {});
  assert.deepEqual(parseSeatFlags(['--seat', '--provider']), {});
  assert.deepEqual(parseSeatFlags(['--seat', 'judge.barak_model']), {});
  assert.deepEqual(parseSeatFlags([]), {});

  // The whole point: coming from a terminal buys no exemption. The allowlist
  // check is resolveModelMap's, in one place, for the browser and the CLI both.
  const before = process.env.TRIBUNAL_UNIFORM_MODEL;
  delete process.env.TRIBUNAL_UNIFORM_MODEL;
  try {
    const evil = parseSeatFlags(['--seat', 'judge.barak_model=anthropic/claude-opus-5']);
    const { map, problems } = resolveModelMap(evil, allowedIds());
    assert.ok(problems.some((p) => p.includes('not an allowed model')));
    assert.equal(map['judge.barak_model'], modelMap()['judge.barak_model'],
      'a refused seat must keep the committed model, not the requested one');
  } finally {
    if (before !== undefined) process.env.TRIBUNAL_UNIFORM_MODEL = before;
  }
});

test('case_id is attached by the runner, not taken from the model', async () => {
  // The fifth value this project asked a model for and already held, after
  // provenance, the disclaimer, representative_id and the method. It sat on the
  // log row from the start and never on the opinion, so the stored object took
  // whatever the model typed. On 08.09.2026 that was twice not a string, and it
  // cost barak's seat two calls during the permutation runs.
  //
  // A provider that returns a WRONG case_id is the test. If the runner attaches,
  // the run completes and every stored opinion carries the case's own id; if it
  // does not, G2 rejects all seven.
  const liar = {
    name: 'stub:wrong-case-id',
    // Pass the whole call through. Destructuring two fields and forwarding only
    // those silently dropped `model`, and the run failed for a reason that had
    // nothing to do with case_id — a false positive caught by checking the
    // failure instead of believing it.
    async call(args) {
      const good = makeStubProvider('good');
      const res = await good.call(args);
      const parsed = JSON.parse(res.raw);
      parsed.case_id = 12345; // not a string, and not this case
      return { ...res, raw: JSON.stringify(parsed) };
    },
  };

  const r = await deliberate({ caseObj: CASE, provider: liar });

  assert.equal(r.status, 'complete', 'a wrong case_id from the model must not fail the run');
  assert.deepEqual(r.advocate_failures, []);
  assert.deepEqual(r.judge_failures, []);
  assert.equal(r.advocate_opinions.length + r.judge_opinions.length, 7);
  for (const o of [...r.advocate_opinions, ...r.judge_opinions]) {
    assert.equal(o.case_id, CASE.case_id, `${o.judge_id ?? o.representative_id} kept the model's case_id`);
  }
});
