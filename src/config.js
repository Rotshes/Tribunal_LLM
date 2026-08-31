// Per-role model map. Every entry currently points at the SAME model.
//
// Do not collapse this to a single constant because the values are equal. The
// shape is the point; the equality is the starting state. The progression from
// one model toward several is graded, and it should arrive as a diff to this
// object plus a decision record citing the per-call logs.
//   docs/01-spec.md §3, docs/decisions/0001-log-every-model-call.md

const MODEL_A = process.env.TRIBUNAL_MODEL;

export const MODEL_MAP = {
  'advocate.jon_snow': MODEL_A,
  'advocate.tyrion_lannister': MODEL_A,
  'advocate.daenerys_targaryen': MODEL_A,
  'advocate.grey_worm': MODEL_A,
  'judge.barak_model': MODEL_A,
  'judge.elon_model': MODEL_A,
  'judge.shamgar_model': MODEL_A,
};

// There is deliberately no default model. Naming one here would make an
// unreviewed choice permanent by accident, and model ids go stale. The
// openrouter provider fails loudly if TRIBUNAL_MODEL is unset.
export const REQUIRES_MODEL_ENV = 'TRIBUNAL_MODEL';

export const EXPECTED_CALLS = 7; // 4 advocates + 3 judges. Not a maximum: an exact count.

export const CALL_CAP = Number(process.env.MAX_CALLS_PER_DELIBERATION ?? 10);

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
