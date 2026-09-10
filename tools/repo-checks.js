#!/usr/bin/env node
// G5 — the no-combination static check.
// G8 — the secret scan.
// G9 — every decision record a file points at actually exists.
//
// These are checks over the repository rather than over one run, so they live
// here rather than in src/gates.js. `npm run check`.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

/**
 * The files git knows about, which is the set these gates are actually about.
 *
 * THIS WALKED THE FILESYSTEM UNTIL TURN 026, and the pre-commit hook exposed
 * two faults in that on its first real run:
 *
 *   · It scanned 1201 files on a working machine against 120 in a clean
 *     container — build caches, `.netlify/`, whatever a tool had left lying
 *     about. Every one of those is a file that cannot reach the repository, so
 *     scanning it is noise at best and a false positive at worst.
 *   · Maintaining SKIP_DIRS meant guessing every directory a future tool might
 *     create. That list is unwinnable.
 *
 * `git ls-files` is the exact answer instead of an approximation of it: the
 * index, which includes files staged but not yet committed — precisely what a
 * pre-commit hook must judge. G5 and G8 both ask what reaches the repository,
 * so the repository's own idea of that is the right universe.
 *
 * Falls back to the filesystem walk where git is unavailable, because a check
 * that refuses to run is worse than one running on a wider set.
 */
function trackedFiles() {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], {
      encoding: 'utf8',
      // stderr silenced: outside a repository git says so loudly, and the
      // fallback below is a normal path, not an error worth printing.
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const files = out.split('\0').filter(Boolean);
    if (files.length) return files;
  } catch {
    // no git, or not a repository
  }
  return [...walkFilesystem('.')];
}

function* walkFilesystem(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFilesystem(p);
    else yield p;
  }
}

const walk = () => trackedFiles();

const problems = [];
let scanned = 0;

for (const file of walk()) {
  const rel = file.replace(/^\.[\\/]/, '').replace(/\\/g, '/');
  if (rel === '.env.example') continue; // documented empty placeholders
  if (rel === '.env') {
    // TRACKED, not merely present. The old check fired whenever a .env existed
    // in the working tree — which is the correct state of every machine that
    // can actually run this app, so `npm run check` failed on a healthy
    // checkout and the pre-commit hook refused every commit on it (turn 026).
    //
    // A gate that fires on the normal case is worse than no gate: it teaches
    // the person to reach for --no-verify, and Module 13 names where that ends.
    // The defect was never the file existing; it is the file being committed.
    // Reaching here at all means git listed it, so it is in the index.
    problems.push('G8: .env is TRACKED BY GIT. Remove it from the index and confirm .gitignore covers it.');
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

// ---------------------------------------------------------------- G9
//
// Every `docs/decisions/NNNN-...` this repository names must be a file.
//
// Added 31.08.2026, after decisions 0001 and 0002 were found to be cited
// EIGHTEEN times — by the schema, the gates, `tools/compare.js`, `CLAUDE.md`,
// the README and half the turn records — with neither file ever written. 0002
// is the non-combination rule: the project's central claim, argued nowhere.
//
// It is the same class of defect as the ones already in the pitfalls list: a
// statement that looks like it has a source, where nobody follows the link. The
// difference is that this one is mechanically checkable, so it should never
// have needed a person to notice it.
const DECISION_REF = /docs\/decisions\/(\d{4}-[a-z0-9-]+)(?:\.md)?/g;
// Only `(00NN)`, not any four digits in brackets. The first draft matched
// `(1300)` — a character count in a test — and reported it as a missing
// decision. A check that invents work gets switched off.
const BARE_REF = /\((00\d{2})\)/g;

const decisionFiles = fs.existsSync('docs/decisions')
  ? fs.readdirSync('docs/decisions').filter((f) => f.endsWith('.md'))
  : [];
const decisionNumbers = new Set(decisionFiles.map((f) => f.slice(0, 4)));

const seenRefs = new Map(); // "0002" -> first file that named it

for (const file of walk()) {
  const rel = file.replace(/^\.[\\/]/, '').replace(/\\/g, '/');
  if (rel.startsWith('docs/decisions/')) continue; // a record may cite itself
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const m of text.matchAll(DECISION_REF)) {
    if (!seenRefs.has(m[1].slice(0, 4))) seenRefs.set(m[1].slice(0, 4), rel);
  }
  // The shorthand this repo uses in prose and comments: "(0002)".
  for (const m of text.matchAll(BARE_REF)) {
    if (!seenRefs.has(m[1])) seenRefs.set(m[1], rel);
  }
}

for (const [number, where] of seenRefs) {
  if (!decisionNumbers.has(number)) {
    problems.push(
      `G9: decision ${number} is cited (first in ${where}) but docs/decisions/ has no such file`,
    );
  }
}

console.log(`checked ${scanned} files`);
if (problems.length === 0) {
  console.log('G5 (no combined result) : pass');
  console.log('G8 (no secrets)         : pass');
  console.log('G9 (decisions exist)    : pass');
  process.exit(0);
}
for (const p of problems) console.error(p);
process.exit(1);
