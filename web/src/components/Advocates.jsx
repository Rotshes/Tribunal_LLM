// The submissions.
//
// Set as numbered submissions with hanging heads, not as cards — the page is a
// law report (turn 017). The roman numeral comes from a CSS counter so the
// numbering cannot drift out of step with the order rendered.
//
// THE CASE FOR THE SEAT comes first and the advocate's own position second, in
// that order, because turn 005 found that judges reading only positions saw no
// opposing argument at all in three runs of five. The seat does not fix the
// position (decision 0004), but it does fix that the case gets argued: an
// advocate departing from its seat says so, and the case still stands.

import { RULING } from '../panel.js';

export default function Advocates({ doc, charge }) {
  if (!doc) return null;

  const name = (id) =>
    charge?.representatives.find((r) => r.id === id)?.name ?? id;

  const opinions = doc.advocate_opinions ?? [];
  const failures = doc.advocate_failures ?? [];

  return (
    <div className="advocates">
      {opinions.map((o) => {
        const departs =
          (o.seat === 'defense' && o.position === 'not_justified') ||
          (o.seat === 'prosecution' && o.position === 'justified');

        return (
          <article className="adv" key={o.representative_id}>
            <div className="adv-head">
              <h4>{name(o.representative_id)}</h4>
              <p className="seat">for the {o.seat}</p>
              <p className="pos">
                Own position: {RULING[o.position] ?? o.position}
                {departs && (
                  <span className="depart">
                    Departs from this seat. The case below still stands.
                  </span>
                )}
              </p>
            </div>

            <div className="adv-body">
              <p className="label">The case for the {o.seat}</p>
              <p>{o.case_for_seat}</p>

              <details>
                <summary>This advocate&rsquo;s own reasoning</summary>
                <p>{o.argument}</p>
              </details>
              {o.concedes?.length > 0 && (
                <details>
                  <summary>Concedes</summary>
                  <ul>
                    {o.concedes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </article>
        );
      })}

      {/* A seat that argued nothing is shown as having argued nothing, in the
          second colour. The judges were told the same thing, so the reader and
          the panel are working from the same record. */}
      {failures.map((f) => (
        <article className="adv failed" key={f.roleId}>
          <div className="adv-head">
            <h4>{name(f.roleId)}</h4>
            <p className="seat">no submission</p>
          </div>
          <div className="adv-body">
            <p className="label">This seat argued nothing</p>
            <p>{f.reason}</p>
            <p className="label">The judges were told this seat put no case.</p>
          </div>
        </article>
      ))}
    </div>
  );
}
