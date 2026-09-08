// Shared vocabulary for displaying a panel.
//
// These were loose constants at the top of the single-file page. They are here
// rather than in a component because three components need them and a second
// copy of JUDGES in a different order would silently break the one guarantee
// the layout makes: three columns, always, in the same order.

/**
 * Fixed order, and load-bearing.
 *
 * `src/config.js` sends the advocate opinions to all three judges in one fixed
 * order so that an ordering effect is detectable across runs rather than
 * varying invisibly. This is the display half of the same idea: the columns do
 * not move, so a reader comparing two runs is comparing like with like.
 */
export const JUDGES = ['barak_model', 'elon_model', 'shamgar_model'];

export const JUDGE_LABEL = {
  barak_model: 'The Barak model',
  elon_model: 'The Elon model',
  shamgar_model: 'The Shamgar model',
};

/** Short forms, for the archive rows where three names must fit on one line. */
export const JUDGE_SHORT = {
  barak_model: 'Barak',
  elon_model: 'Elon',
  shamgar_model: 'Shamgar',
};

export const RULING = {
  justified: 'Justified',
  not_justified: 'Not justified',
};

/**
 * What a run actually used.
 *
 * One model name is a lie the moment two roles differ, and this line is the
 * only place a reader sees the allocation. Since decision 0009 the advocates
 * and the judges never run the same model, so the mixed branch is the normal
 * one rather than the exception.
 */
export function describeModels(doc) {
  const m = doc?.model_map;
  if (!m) return doc?.model ?? '';
  const distinct = [...new Set(Object.values(m).filter(Boolean))];
  if (distinct.length === 0) return doc?.model ?? '';
  if (distinct.length === 1) return distinct[0];
  return `mixed panel: ${Object.entries(m)
    .map(([role, model]) => `${role.split('.')[1]}=${model}`)
    .join(', ')}`;
}

/**
 * A model observed to fail says so in the option the visitor picks it from.
 *
 * Two entries on the allowlist appear in OpenRouter's own response_format
 * catalogue and still fail in production — one has no routable endpoint, one
 * returns prose. Offering those identically to the ones that work is a trap,
 * not a choice: a seat argues nothing and nothing on screen said it was likely.
 *
 * Since turn 018 those two are filtered out of the picker entirely and this
 * function no longer fires on them there — it stays because it reads the record
 * rather than a hardcoded list, so a model that starts failing is labelled the
 * moment its `observed` field says so, before anyone thinks to filter it.
 *
 * `works (slow)` is the case that IS live in the picker. Seed 2.1 Turbo answers
 * correctly and takes about a minute, and the advocates run concurrently, so one
 * slow seat sets the length of the whole first stage. That is a real cost to a
 * visitor and nothing else on screen would have shown it.
 *
 * The wording comes from `observed` in panel/models.json, which records what a
 * run actually did rather than what a catalogue claims. (turn 013)
 */
export function modelHealth(model) {
  const observed = String(model?.observed ?? '');
  if (observed.startsWith('FAILS')) return ' · known to fail';
  if (observed.startsWith('UNRELIABLE')) return ' · unreliable';
  if (observed.startsWith('works (slow)')) return ' · slow, about a minute';
  if (observed.startsWith('works, INTERMITTENTLY')) return ' · works, but has failed a run';
  return '';
}
