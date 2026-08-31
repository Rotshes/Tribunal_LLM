// Per-role model map. This is the committed allocation.
//
// Until turn 010 every entry here was the same model, read from
// TRIBUNAL_MODEL, and this comment said the progression from one model toward
// several "should arrive as a diff to this object plus a decision record citing
// the per-call logs". This is that diff.
//
//   why:      docs/decisions/0009-advocates-and-judges-run-different-models.md
//   evidence: docs/turns/010-model-comparison.md
//
// The short version: across twenty-three runs on T-001, which model the JUDGES
// run decides whether the panel divides at all. Uniform gemini-3.7-flash gave
// three identical rulings in five runs out of five — a panel that cannot
// disagree, which is the one outcome this project has no use for. Putting
// 3.7-flash on the advocates while leaving flash-lite on the judges brought the
// division straight back. So: the better model argues, the model that actually
// produces a panel rules.

const ADVOCATE_MODEL = 'google/gemini-3.7-flash';
const JUDGE_MODEL = 'google/gemini-3.5-flash-lite';

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

  const advocate = uniform ?? ADVOCATE_MODEL;
  const judge = uniform ?? JUDGE_MODEL;

  return {
    'advocate.jon_snow': advocate,
    'advocate.tyrion_lannister': advocate,
    'advocate.daenerys_targaryen': advocate,
    'advocate.grey_worm': advocate,
    'judge.barak_model': judge,
    'judge.elon_model': judge,
    'judge.shamgar_model': judge,
  };
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
