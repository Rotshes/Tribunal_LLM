// The three rulings.
//
// THE RULE THIS COMPONENT EXISTS TO KEEP (decision 0002): the three are shown
// side by side as peers and are never combined. No majority, no headline, no
// score, no "2 of 3". If a future change here starts computing one value from
// three, G5 will fail the build and it should.
//
// Fixed order, always three columns. A judge that failed OCCUPIES ITS COLUMN as
// a failure — two rulings must never be presented as the outcome, because two
// rulings in a three-column layout look exactly like a panel where one judge
// happened not to be shown.

import { JUDGES, JUDGE_LABEL, RULING } from '../panel.js';

export default function Rulings({ doc }) {
  if (!doc) return null;

  const byId = new Map((doc.judge_opinions ?? []).map((o) => [o.judge_id, o]));
  const failedById = new Map((doc.judge_failures ?? []).map((f) => [f.roleId, f]));

  return (
    <div className="rulings">
      {JUDGES.map((id) => {
        const o = byId.get(id);
        const f = failedById.get(id);

        if (!o) {
          return (
            <article className="judge failed" key={id}>
              <h4>{JUDGE_LABEL[id]}</h4>
              <p className="method">no ruling</p>
              <p className="ruling">Deliberation failed</p>
              <p>{f?.reason ?? 'This judge produced no opinion.'}</p>
              <p className="disclaimer">
                This is a failure, not an acquittal. The other rulings are not the
                outcome of the case.
              </p>
            </article>
          );
        }

        return (
          <article className="judge" key={id}>
            <h4>{JUDGE_LABEL[id]}</h4>
            <p className="method">{o.method}</p>
            {/* `data-ruling` exists only so the stylesheet can colour this
                column by which way it went, making the shape of the panel
                legible before a word is read. It is per column: nothing
                compares the three, and nothing counts them. (0002) */}
            <p className="ruling" data-ruling={o.ruling}>
              {RULING[o.ruling] ?? o.ruling}
            </p>
            <ul className="grounds">
              {(o.grounds ?? []).map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
            <details>
              <summary>Full opinion</summary>
              <p>{o.reasoning}</p>
            </details>
            <details>
              <summary>Answers to the advocates</summary>
              <ul>
                {(o.responds_to ?? []).map((r, i) => (
                  <li key={i}>
                    <b>{r.representative_id}</b> — {r.answer}
                  </li>
                ))}
              </ul>
            </details>
            {/* Attached by the runner, never asked of the model, and compared
                against panel/judges.json by G6. (decision 0005) */}
            <p className="disclaimer">{o.disclaimer}</p>
          </article>
        );
      })}
    </div>
  );
}
