// Per-role model map. This is the committed allocation.
//
//   why:      docs/decisions/0013-seven-seats-seven-models.md
//   supersedes: docs/decisions/0009-advocates-and-judges-run-different-models.md
//   evidence: docs/turns/018-seven-seats-seven-models.md
//
// Turn 010 replaced one model for all seven calls with two: 3.7-flash argues,
// flash-lite rules, because across twenty-three runs the model the JUDGES run
// decided whether the panel divided at all. Uniform 3.7-flash gave three
// identical rulings in five runs out of five — a panel that cannot disagree,
// the one outcome this project has no use for.
//
// Turn 018 replaces two with seven, one per seat (0013). That was asked for,
// and it is not free: with three judge models on three judges, a division in
// the panel can no longer be attributed to the judicial method rather than to
// the model, which is the claim 0009's whole comparison existed to support.
// 0009 named this experiment and declined it for want of runs; 0013 takes it
// anyway, on instruction, and says so.
//
// TRIBUNAL_UNIFORM_MODEL below is what keeps that recoverable: one run with it
// set puts all seven seats on one model, and the difference between that run
// and this allocation is the only place the method-versus-model question can
// still be asked.
//
// WHICH MODEL SITS WHERE IS NOT ARBITRARY.
//
// The judges hold the three most different models available — three separate
// vendors — because the judges are the seats where a shared lineage would
// quietly manufacture agreement. The advocates hold the near-siblings, because
// an advocate's seat already fixes what gets argued (0004) and its job is to
// put a case, not to reach an independent conclusion. Same seven distinct ids
// either way; this arrangement spends the distinctness where it buys something.
//
// Every id below is in panel/models.json with a dated `observed` record of a
// real call. A test asserts that, that the seven are distinct, and that each
// one was observed to WORK — the allowlist accepts models that fail, and the
// committed allocation may not contain one.

const SEAT_MODELS = {
  // The advocates. gemini-3.7-flash keeps jon_snow because it is the model
  // 0009's advocate finding was made on; moving it would have discarded the
  // only advocate-side evidence this project has.
  'advocate.jon_snow': 'google/gemini-3.7-flash',
  'advocate.tyrion_lannister': 'google/gemini-3.8-flash',
  'advocate.daenerys_targaryen': 'google/gemini-3.6-flash',
  'advocate.grey_worm': 'qwen/qwen3.7-flash',

  // The judges, one vendor each. flash-lite keeps barak_model for the same
  // reason: it is the seat every pre-018 judge measurement was taken on, so it
  // is the one column of the panel that stays comparable across the change.
  'judge.barak_model': 'google/gemini-3.5-flash-lite',
  'judge.elon_model': 'inception/mercury-2.5-preview',
  'judge.shamgar_model': 'nvidia/nemotron-3.5-lightning',
};

// This is a FUNCTION, not a constant, and that is load-bearing.
//
// ES module imports are evaluated before the importing module's body runs, so
// a `const MODEL_MAP = { ... process.env.X }` here is built before cli.js has
// had a chance to read .env — every entry comes out undefined and all seven
// calls fail with "No model mapped". Read the environment when the value is
// needed, not when the file is loaded.
export function modelMap() {
  // The control condition, and only that. Setting TRIBUNAL_UNIFORM_MODEL
  // flattens all seven roles onto one model, which is how the three conditions
  // in turn 010 were measured and how a fourth would be. It is not how the
  // project runs: unset, the committed allocation above applies.
  const uniform = process.env.TRIBUNAL_UNIFORM_MODEL || null;

  // A fresh object every call. Returning SEAT_MODELS itself would hand the
  // committed allocation to resolveModelMap() below, which writes a visitor's
  // overrides straight into it — one request choosing a model would change
  // what every later request considered the default, for the life of the
  // process. Spreading it is what keeps a per-run choice a per-run choice.
  if (uniform) {
    return Object.fromEntries(Object.keys(SEAT_MODELS).map((key) => [key, uniform]));
  }
  return { ...SEAT_MODELS };
}

export const ROLE_KEYS = Object.keys(modelMap());

/**
 * `TRIBUNAL_MODEL` set every role until turn 010 and now sets nothing.
 *
 * Silently ignoring a variable someone has in their .env is exactly how a
 * committed allocation dies without anyone noticing — the runs keep succeeding
 * and keep using the old single model. So it is not ignored silently: the
 * runner prints this, and the reader can act on it.
 */
export function configWarnings(env = process.env) {
  const out = [];
  if (env.TRIBUNAL_MODEL) {
    out.push(
      'TRIBUNAL_MODEL is set and is no longer read. The per-role allocation is ' +
        'committed in src/config.js (decision 0009). For a uniform control run, ' +
        'use TRIBUNAL_UNIFORM_MODEL instead; otherwise remove the line from .env.',
    );
  }
  return out;
}

/**
 * The committed map above, with per-role overrides applied.
 *
 * Overrides come from a visitor choosing a model in the browser, so every one
 * of them is untrusted input and is checked twice: the key must be a role this
 * tribunal actually has, and the value must be a model on the allowlist in
 * panel/models.json. A model id is never taken from a request and used.
 *
 * The committed allocation is unchanged by any of this. A visitor's choice is
 * one run, not a project decision; changing the allocation is a diff to
 * modelMap() plus a decision record, as decision 0009 was.
 */
export function resolveModelMap(overrides = {}, allowedIds = null) {
  const base = modelMap();
  const problems = [];

  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(base, key)) {
      problems.push(`"${key}" is not a role in this tribunal`);
      continue;
    }
    if (typeof value !== 'string' || value === '') continue; // "use the default"
    if (allowedIds && !allowedIds.has(value)) {
      problems.push(`"${value}" is not an allowed model`);
      continue;
    }
    base[key] = value;
  }

  // One message per distinct problem. Setting a whole layer to a bad model
  // otherwise reports it three or four times, which reads as several faults.
  return { map: base, problems: [...new Set(problems)] };
}

export const EXPECTED_CALLS = 7; // 4 advocates + 3 judges. Not a maximum: an exact count.

// Also a function, for the same reason.
export function callCap() {
  return Number(process.env.MAX_CALLS_PER_DELIBERATION ?? 10);
}

export const PROMPT_FILES = {
  jon_snow: 'prompts/advocate-jon-snow.md',
  tyrion_lannister: 'prompts/advocate-tyrion-lannister.md',
  daenerys_targaryen: 'prompts/advocate-daenerys-targaryen.md',
  grey_worm: 'prompts/advocate-grey-worm.md',
  barak_model: 'prompts/judge-barak-model.md',
  elon_model: 'prompts/judge-elon-model.md',
  shamgar_model: 'prompts/judge-shamgar-model.md',
};

// Fixed order. All three judges receive the advocate opinions in this order,
// so that an ordering effect is at least detectable across runs rather than
// varying invisibly. docs/01-spec.md §3.
export const ADVOCATE_ORDER = [
  'jon_snow',
  'tyrion_lannister',
  'daenerys_targaryen',
  'grey_worm',
];

export const JUDGE_ORDER = ['barak_model', 'elon_model', 'shamgar_model'];
