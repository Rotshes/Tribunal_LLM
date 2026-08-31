// Writing a terminal report to a file, as evidence.
//
// Separate from compare.js so it can be tested without running a comparison,
// and so the next tool that needs to produce an evidence file does not
// reinvent it.
//
// Why this exists at all is in the --out comment in tools/compare.js and in
// docs/turns/010-model-comparison.md §7a: shell redirection produced an
// evidence file that was UTF-16, BOM-prefixed and full of colour escapes, and
// nothing about the command said so.

const ANSI = /\x1b\[[0-9;]*m/g;

/** Colour codes are for a terminal. A file that keeps them is not readable. */
export function stripAnsi(s) {
  return String(s).replace(ANSI, '');
}

/**
 * Mirror everything written with console.log into `file`, plain and unstyled,
 * while still printing it to the terminal.
 *
 * Written on process exit rather than incrementally: a partial evidence file
 * from a crashed run would look like a complete one.
 *
 * `fs` and `path` are passed in rather than imported so a test can capture
 * without touching the disk.
 */
export function captureTo(file, fs, path, out = console) {
  const lines = [];
  const realLog = out.log.bind(out);

  out.log = (...args) => {
    lines.push(args.map(stripAnsi).join(' '));
    realLog(...args);
  };

  const write = () => {
    const dir = path.dirname(path.resolve(file));
    fs.mkdirSync(dir, { recursive: true });
    // Explicit \n, never os.EOL: this file is committed, and .gitattributes
    // forces LF for exactly the same reason.
    fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
  };

  process.on('exit', () => {
    write();
    realLog(`\x1b[2mwritten to ${file}\x1b[0m`);
  });

  // Returned for tests; the process-exit hook is the real caller.
  return { lines, write };
}
