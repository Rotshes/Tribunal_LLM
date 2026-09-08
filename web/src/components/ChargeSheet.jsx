// The charge sheet, as the backend holds it.
//
// Served from /api/case rather than duplicated here: two copies of a charge
// sheet drift, and the one the browser showed would eventually not be the one
// the models were given — a difference nobody notices until an opinion cites a
// fact the reader cannot see.

export default function ChargeSheet({ charge }) {
  if (!charge) return null;

  return (
    <div className="case">
      <h3>{charge.title}</h3>
      <p className="docket">Cause no. {charge.case_id}</p>
      <p className="issue">{charge.issue}</p>
      <p className="schedule-head">
        Schedule — the agreed record, and the only facts anyone may cite
      </p>
      <ul className="facts">
        {/* The order is permanent: opinions cite by index, and a correction
            appends rather than reordering. The CSS counter renders [0]…[4]. */}
        {charge.agreed_facts.map((fact, i) => (
          <li key={i}>
            <span>{fact}</span>
          </li>
        ))}
      </ul>
      <p className="scope">{charge.scope.note}</p>
    </div>
  );
}
