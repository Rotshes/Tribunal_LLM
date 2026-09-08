// Past proceedings — definition of done item 3.
//
// Every row shows ALL THREE rulings. Never a tally, never "2 of 3", never a
// "they differ" flag: the rule that governs a live result governs its record
// too, and a list is exactly where a summary column would feel harmless.
// (decision 0002)

import { JUDGES, JUDGE_SHORT, RULING } from '../panel.js';

export default function Archive({ runs, error, onOpen, opening }) {
  if (error) {
    return (
      <div className="banner">
        <h3>The archive could not be read</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!runs) return <p className="note">Loading…</p>;

  if (runs.length === 0) {
    return (
      <p className="note">
        No proceedings have been held yet. The first one convened above will
        appear here.
      </p>
    );
  }

  return (
    <div>
      {runs.map((r) => {
        const when = String(r.ran_at ?? '').slice(0, 16).replace('T', ' ');

        // A run where fewer than seven calls landed says so here, so nobody
        // opens an incomplete panel expecting a complete one.
        const short =
          r.calls_succeeded != null &&
          r.calls_attempted != null &&
          r.calls_succeeded < r.calls_attempted;

        return (
          <div className="run-row" key={r.deliberation_id}>
            <div className="run-when">
              {when} · {r.case_id}
            </div>
            <div className="run-rulings">
              {JUDGES.map((j) => (
                <span key={j}>
                  {JUDGE_SHORT[j]}{' '}
                  <b data-ruling={r.rulings?.[j]}>
                    {r.rulings?.[j] ? (RULING[r.rulings[j]] ?? r.rulings[j]) : '—'}
                  </b>
                </span>
              ))}
              {short && (
                <span className="run-incomplete">
                  {r.calls_succeeded}/{r.calls_attempted} calls — incomplete
                </span>
              )}
            </div>
            <div>
              <button
                className="run-open"
                type="button"
                aria-busy={opening === r.deliberation_id ? 'true' : undefined}
                disabled={Boolean(opening)}
                onClick={() => onOpen(r.deliberation_id)}
              >
                {opening === r.deliberation_id ? 'Opening…' : 'Read it'}
              </button>
              <div className="run-meta">{String(r.deliberation_id).slice(0, 8)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
