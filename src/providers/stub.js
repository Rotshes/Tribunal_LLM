// A fake model, for proving the gates fire before any money is spent.
//
// This is not a mock in the testing sense — it is a deliberately misbehaving
// model. Each failure mode below is one this design will actually meet:
// fluent prose where an object was demanded, an invented fact citation, a
// forbidden field, a one-sided judge, a call that simply dies.
//
// A gate that has never caught anything counts as no gate at all. This is how
// they get to catch something before the real models are wired up.

const pad = (s, n) => (s + ' ').repeat(Math.ceil(n / (s.length + 1))).slice(0, n);

function advocateOpinion(caseObj, rep, { position }) {
  return {
    case_id: caseObj.case_id,
    role: 'advocate',
    representative_id: rep.id,
    seat: rep.seat,
    position,
    relies_on_facts: [0, 4],
    key_points: [
      pad(`Stub key point for ${rep.name}, ${rep.seat} seat.`, 60),
      pad('A second point, so the array is not minimal.', 60),
    ],
    concedes: [pad('A stub concession against this advocate own seat.', 60)],
    case_for_seat: pad(`Stub case for the ${rep.seat} seat, argued in good faith.`, 400),
    argument: pad(`Stub argument in the voice of ${rep.name}.`, 600),
  };
}

function judgeOpinion(caseObj, judgeId, method, { ruling, respondTo }) {
  return {
    case_id: caseObj.case_id,
    role: 'judge',
    judge_id: judgeId,
    method,
    ruling,
    grounds: [
      pad('Stub ground one, stated so another judge could disagree.', 60),
      pad('Stub ground two.', 60),
    ],
    relies_on_facts: [0, 1, 4],
    responds_to: respondTo.map((id) => ({
      representative_id: id,
      answer: pad(`Stub answer to ${id}.`, 60),
    })),
    reasoning: pad(`Stub reasoning for ${judgeId}, ruling ${ruling}.`, 800),
    disclaimer:
      'A judicial-method profile, not the judge. This opinion adapts interpretive method from published work. It does not impersonate the judge, does not represent his views, and does not predict how any real court would rule.',
  };
}

const JUDGE_METHODS = {
  barak_model: 'purposive, rights-centered, systemic',
  elon_model: 'traditionalist, source-led, competence-limiting',
  shamgar_model: 'institutional, powers-first, fact-heavy',
};

// Judges disagree by default, because a stub that always agrees would hide the
// one thing the side-by-side display exists to show.
const DEFAULT_RULINGS = {
  barak_model: 'justified',
  elon_model: 'not_justified',
  shamgar_model: 'not_justified',
};

/**
 * mode:
 *   good        every response valid
 *   prose       one advocate returns an essay instead of an object   -> G2
 *   badfact     one judge cites a fact index that does not exist     -> G3
 *   verdict     one judge emits a forbidden `verdict` field          -> G2/G6
 *   onesided    one judge answers only the seat it ruled for         -> G2b
 *   judgefail   one judge call throws                                -> failure display
 *   unanimous   all three judges agree (a legitimate outcome)
 *   copied_case one advocate pastes its own argument into case_for_seat -> G2
 */
export function makeStubProvider(mode = 'good') {
  return {
    name: `stub:${mode}`,
    async call({ role, roleId, caseObj, advocateOpinions }) {
      await new Promise((r) => setTimeout(r, 5));

      if (role === 'advocate') {
        const rep = caseObj.representatives.find((r) => r.id === roleId);
        if (mode === 'fumbled_identity' && roleId === 'daenerys_targaryen') {
          // Reproduces a real failure: on 31.08 this model returned
          // "daenerys_targator" and "daenerys_targatorn" in two separate runs,
          // having been handed the correct id in its prompt. The runner now
          // attaches identity, so this must no longer fail the call.
          const op = advocateOpinion(caseObj, rep, { position: 'not_justified' });
          op.representative_id = 'daenerys_targator';
          op.seat = 'defense'; // wrong seat too, for good measure
          return { raw: JSON.stringify(op), usage: { in: 4200, out: 900 } };
        }
        if (mode === 'prose' && roleId === 'tyrion_lannister') {
          return {
            raw: 'Well. Where to begin. The question before this tribunal is not whether my client acted, but whether any of us would have acted differently...',
            usage: { in: 4200, out: 380 },
          };
        }
        const position =
          rep.seat === 'defense' ? 'justified' : 'not_justified';
        const op = advocateOpinion(caseObj, rep, { position });
        if (mode === 'copied_case' && roleId === 'grey_worm') {
          // The cheapest way to fake a steelman: paste your own argument into
          // the field meant to hold the other case.
          op.case_for_seat = op.argument;
        }
        return { raw: JSON.stringify(op), usage: { in: 4200, out: 900 } };
      }

      if (mode === 'judgefail' && roleId === 'elon_model') {
        throw new Error('upstream timeout after 60s');
      }

      const ruling =
        mode === 'unanimous' ? 'not_justified' : DEFAULT_RULINGS[roleId];

      // Answer one advocate from each seat, so G2b passes by default.
      let respondTo = ['jon_snow', 'grey_worm'];
      if (mode === 'onesided' && roleId === 'shamgar_model') {
        // ruling not_justified -> seat ruled against is defense; answering only
        // the prosecution is the failure G2b exists to catch.
        respondTo = ['daenerys_targaryen', 'grey_worm'];
      }

      const op = judgeOpinion(caseObj, roleId, JUDGE_METHODS[roleId], {
        ruling,
        respondTo,
      });

      if (mode === 'badfact' && roleId === 'barak_model') {
        op.relies_on_facts = [0, 99];
      }
      if (mode === 'fumbled_identity' && roleId === 'elon_model') {
        // Reproduces run A of turn 003, where a judge PARAPHRASED its own
        // disclaimer. The runner now attaches the exact text from
        // panel/judges.json, so this must no longer reach the screen.
        op.disclaimer =
          'A judicial-method profile. It does not impersonate the judgement, does not represent personal views.';
        op.judge_id = 'elon_modl';
      }
      if (mode === 'verdict' && roleId === 'shamgar_model') {
        op.verdict = 'guilty'; // g5-ok: the stub deliberately emits a forbidden field so G2/G6 can catch it
      }

      return { raw: JSON.stringify(op), usage: { in: 11800, out: 1400 } };
    },
  };
}
