// Telling "the model got it wrong" apart from "the account ran out of money".
//
// This lives in src/ rather than inside tools/compare.js so that it can be
// tested, and so that anything else which reports failure rates uses the same
// rule rather than writing a second one that drifts from it.
//
// WHY IT EXISTS
//
// On 08.09.2026 five runs on a newly seated allocation reported 21 of 35 calls
// failed — 60% — and the allocation was read as broken. Fifteen of the
// twenty-one were OpenRouter answering "This request requires more credits" and
// "Key limit exceeded": the credit ran out partway through the session. No model
// was asked anything on those calls. The one run that completed before the wall
// was a clean 7/7 whose panel divided.
//
// "Can these models sit a tribunal" and "does this account have money" are
// different questions. A rate that mixes them answers neither, and this one
// pointed at the models while the reason pointed at the wallet.

/**
 * True when the provider refused the call for a reason about the ACCOUNT —
 * billing, quota, a key spend limit, authentication — rather than the model
 * producing something wrong.
 *
 * Written against what makes it a provider refusal, not against the shape of an
 * error string. Two deliberate exclusions:
 *
 *   · 429 rate-limiting is NOT account-side. The provider had no capacity, the
 *     model was reachable in principle, and a seat that 429s under a seven-call
 *     run is a seat that fails — qwen3.7-flash lost grey_worm's seat for it.
 *   · 404 "no endpoints found" is NOT account-side either. Nothing is wrong with
 *     the account; that model has nowhere to run with the parameters we send.
 *
 * Both of those are real evidence against a model. Running out of credit is not.
 */
export function isAccountFailure(reason) {
  return /requires more credits|key limit exceeded|insufficient (?:credit|balance|funds)|quota exceeded|payment required|\b40[12]\b/i.test(
    String(reason ?? ''),
  );
}
