#!/usr/bin/env node
// G5 — the no-combination static check.
// G8 — the secret scan.
//
// These are checks over the repository rather than over one run, so they live
// here rather than in src/gates.js. `npm run check`.

import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'logs', 'dist']);

// Prose whose job is to explain or forbid the rule: the decision records, the
// standing brief, the prompts that name the forbidden fields so a model does
// not emit them. These are documents, not places a combined result could be
// computed.
//
// NOTE what is deliberately NOT exempt: everything under src/. That is exactly
// where a combined result would be introduced, so exempting it would leave the
// gate checking nowhere that matters. Code that legitimately names one of these
// fields marks the line `g5-ok: <reason>` instead — an exemption you can see
// and review, rather than a whole file quietly excluded.
const G5_EXEMPT_PROSE = ['docs/', 'prompts/', 'README.md', 'CLAUDE.md', 'cases/'];

const G5_PRAGMA = /g5-ok:/;

// A combined result would be a FIELD, so look for it in that shape:
// g5-ok: this comment is the pattern documentation itself
const G5_PATTERN =
  /\b(verdict|majority|consensus|aggregate|averaged?Ruling|combinedRuling|overallRuling|finalRuling|rulingScore)\b\s*[:=]/i;

const G8_PATTERNS = [
  /sk-or-v1-[A-Za-z0-9]{16,}/,
  /OPENROUTER_API_KEY\s*=\s*\S+/,
  /SUPABASE_SERVICE_KEY\s*=\s*\S+/,
];

// Key MATERIAL is never exemptible. These two patterns match the actual shape
// of a key, so a line matching one is a leak whatever it claims about itself,
// and no pragma can wave it through.
const G8_UNPARDONABLE = [/sk-or-v1-[A-Za-z0-9]{16,}/, /sb_secret_[A-Za-z0-9]{16,}/];

// The other patterns match `NAME = value`, which is the shape of a leaked .env
// line — and also the shape of a test legitimately setting the variable. That
// has now happened twice.
//
// The first time, the test did not need the real variable name and the fixture
// was renamed. The second time it did: a test of the call-timeout path has to
// construct the real provider, which reads the real variable. Renaming was not
// available, and the alternatives were worse than a pragma — writing
// `process.env[SOME_VAR] = …` would have passed the scan by hiding from it,
// which is an exemption nobody can review.
//
// So: `g8-ok: <reason>`, the same visible per-line escape G5 uses, and it
// cannot cover key material. A reason is required — a bare pragma does not
// count — because the point is that a later reader can judge it.
const G8_PRAGMA = /g8-ok:\s*\S+/;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const problems = [];
let scanned = 0;

for (const file of walk('.')) {
  const rel = file.replace(/^\.[\\/]/, '').replace(/\\/g, '/');
  if (rel === '.env.example') continue; // documented empty placeholders
  if (rel === '.env') {
    problems.push(`G8: .env is present in the working tree — confirm it is gitignored`);
    continue;
  }

  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  scanned += 1;

  const exempt = G5_EXEMPT_PROSE.some((e) => rel.startsWith(e));
  if (!exempt) {
    text.split('\n').forEach((line, i) => {
      if (G5_PATTERN.test(line) && !G5_PRAGMA.test(line)) {
        problems.push(
          `G5: ${rel}:${i + 1} looks like a combined-result field — ${line.trim()}`,
        );
      }
    });
  }

  text.split('\n').forEach((line, i) => {
    const pardonable = !G8_UNPARDONABLE.some((p) => p.test(line));
    if (pardonable && G8_PRAGMA.test(line)) return;

    for (const p of G8_PATTERNS) {
      if (p.test(line)) {
        problems.push(`G8: ${rel}:${i + 1} looks like a live secret`);
      }
    }
  });
}

console.log(`checked ${scanned} files`);
if (problems.length === 0) {
  console.log('G5 (no combined result) : pass');
  console.log('G8 (no secrets)         : pass');
  process.exit(0);
}
for (const p of problems) console.error(p);
process.exit(1);
