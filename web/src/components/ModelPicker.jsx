// The per-role model picker.
//
// The list comes from the server and is the same list the server validates
// against, so the browser cannot name a model the backend would refuse — and,
// more to the point, a visitor cannot name one it would ACCEPT that nobody
// chose. On a public URL the alternative is a page that lets anyone spend the
// project's credit on the most expensive model in the catalogue, seven calls at
// a time. (src/models.js)

import { JUDGE_LABEL, modelHealth } from '../panel.js';

/**
 * The two halves of the panel, in the order they run.
 *
 * Advocates first because they go first: four calls concurrently, then the
 * three judges on what those four produced. The blurbs say what each half does
 * rather than repeating the model names, which are in the dropdowns already.
 */
const GROUPS = [
  {
    kind: 'advocate',
    heading: 'The advocates',
    blurb:
      'Four, argued concurrently, none seeing the others. Each puts the case for its seat whatever it personally concludes.',
  },
  {
    kind: 'judge',
    heading: 'The judges',
    blurb:
      'Three, each by a different judicial method, each receiving byte-identical input and never seeing another judge.',
  },
];

export default function ModelPicker({ charge, models, chosen, onChange, onReset }) {
  if (!models || !charge) return null;

  const rep = (id) => charge.representatives.find((r) => r.id === id);
  const advocateName = (id) => rep(id)?.name ?? id;
  const seatOf = (id) => rep(id)?.seat ?? '';

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>The panel</h3>
        <button className="linkish" type="button" onClick={onReset}>
          Reset to the committed defaults
        </button>
      </div>

      {/* Two groups, not one list of seven.
          The advocates and the judges do different jobs and run in two stages,
          four then three, and the allocation is far easier to read when the
          layout says so rather than leaving it to be inferred from the order.
          Since 0013 all seven defaults differ, so the grouping is now the only
          thing on screen that still says which half a seat belongs to.
          The roles still come from the server in the server's order. */}
      {GROUPS.map(({ kind, heading, blurb }) => {
        const keys = models.roles.filter((key) => key.startsWith(`${kind}.`));
        if (keys.length === 0) return null;

        return (
          <div className="role-group" key={kind}>
            <h4>{heading}</h4>
            <p>{blurb}</p>
            <div className="roles">
              {keys.map((key) => {
                const id = key.split('.')[1];
                const who = kind === 'advocate' ? `${seatOf(id)} advocate` : 'judge';
                const name =
                  kind === 'advocate' ? advocateName(id) : (JUDGE_LABEL[id] ?? id);

                return (
                  <div className="role" key={key}>
                    <span className="who">{who}</span>
                    <label htmlFor={`m-${key}`}>{name}</label>
                    <select
                      id={`m-${key}`}
                      data-role={key}
                      value={chosen[key] ?? models.defaults[key] ?? ''}
                      onChange={(e) => onChange(key, e.target.value)}
                    >
                      {models.models.map((m) => (
                        <option value={m.id} key={m.id}>
                          {`${m.label} — $${m.price_per_m_in}/M in${modelHealth(m)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="panel-note">
        All seven seats run a different model by default — that is the committed
        allocation, not a suggestion; anything you change here applies to this
        run only. Seven calls, so the cost is roughly seven times one call. The
        list offers only models this project has run and seen work, and marks the
        one that works but takes about a minute. Two more are on the allowlist
        and are not offered, with the reason recorded against each in{' '}
        <code>panel/models.json</code>.
      </p>
    </div>
  );
}
