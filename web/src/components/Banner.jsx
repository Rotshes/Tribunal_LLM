// A failure, shown as a failure.
//
// The project's standing rule is that a failure is never presented as a ruling,
// never defaulted to acquittal, and never rendered as silence. This is the
// component that carries the ones which are not a judge's own column.

export default function Banner({ title, lines = [], code = false }) {
  if (!title) return null;

  return (
    <div className="banner">
      <h3>{title}</h3>
      {lines.length > 0 && (
        <ul>
          {lines.map((line, i) => (
            <li key={i}>{code ? <code>{line}</code> : line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
