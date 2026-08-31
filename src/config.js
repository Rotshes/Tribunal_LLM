// Per-role model map. Every entry currently points at the SAME model.
//
// Do not collapse this to a single constant because the values are equal. The
// shape is the point; the equality is the starting state. The progression from
// one model toward several is graded, and it should arrive as a diff to this
// object plus a decision record citing the per-call logs.
//   docs/01-spec.md §3, docs/decisions/0001-log-every-model-call.md

// This is a FUNCTION, not a constant, and that is load-bearing.
//
// ES module imports are evaluated before the importing module's body runs, so
// a `const MODEL_MAP = { ... process.env.TRIBUNAL_MODEL }` here is built before
// cli.js has had a chance to read .env — every entry comes out undefined and
// all seven calls fail with "No model mapped". Read the environment when the
// value is needed, not when the file is loaded.
export function modelMap() {
  const MODEL_A = process.env.TRIBUNAL_MODEL;
  return {
    'advocate.jon_snow': MODEL_A,
    'advocate.tyrion_lannister': MODEL_A,
    'advocate.daenerys_targaryen': MODEL_A,
    'advocate.grey_worm': MODEL_A,
    'judge.barak_model': MODEL_A,
    'judge.elon_model': MODEL_A,
    'judge.shamgar_model': MODEL_A,
  };
}

export const ROLE_KEYS = Object.keys(modelMap());

/**
 * The committed map above, with per-role overrides applied.
 *
 * Overrides come from a visitor choosing a model in the browser, so every one
 * of them is untrusted input and is checked twice: the key must be a role this
 * tribunal actually has, and the value must be a model on the allowlist in
 * panel/models.json. A model id is never taken from a request and used.
 *
 * The committed default is unchanged by any of this. The progression from one
 * model toward several is a diff to modelMap() plus a decision record citing
 * the logs; a visitor's choice is one run, not a project decision.
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

  return { map: base, problems };
}

// There is deliberately no default model. Naming one here would make an
// unreviewed choice permanent by accident, and model ids go stale. The
// openrouter provider fails loudly if TRIBUNAL_MODEL is unset.
export const REQUIRES_MODEL_ENV = 'TRIBUNAL_MODEL';

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
