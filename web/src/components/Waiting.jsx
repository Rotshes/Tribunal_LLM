// The wait.
//
// Seven calls take about twenty seconds and nothing streams, so the honest
// thing is to show which stage is running and how long it has taken.
//
// NO PROGRESS BAR, deliberately. We genuinely do not know how far along a model
// is, and a bar that fills at a rate we invented would be a claim we cannot
// support — the same objection as a combined ruling, in a smaller place.

import { useEffect, useState } from 'react';

/** After this many seconds the advocates are almost certainly done. Labelled
 *  as an estimate below, because that is what it is. */
const JUDGES_LIKELY_AFTER_S = 15;

export default function Waiting({ since }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!since) return undefined;
    const tick = () => setSeconds(Math.round((Date.now() - since) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [since]);

  if (!since) return null;

  const judgesRunning = seconds > JUDGES_LIKELY_AFTER_S;

  return (
    <div id="status">
      <div className="stage" data-state={judgesRunning ? 'done' : 'doing'}>
        <span>
          <b>Four advocates</b> argue, in parallel
        </span>
      </div>
      <div className="stage" data-state={judgesRunning ? 'doing' : 'todo'}>
        <span>
          <b>Three judges</b> rule on those arguments
        </span>
      </div>
      <p className="elapsed">{seconds}s elapsed</p>
    </div>
  );
}
