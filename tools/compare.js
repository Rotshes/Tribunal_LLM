#!/usr/bin/env node
// Tabulate stored deliberations so runs can be compared. `npm run compare`.
//
// WHAT THIS MAY NOT DO
// --------------------
// It must not reduce the three rulings of a single deliberation to one value.
// No majority, no tally, no "2 of 3 agree" margin — decision 0002 names that
// summary explicitly, and a comparison tool is exactly where it would creep in
// wearing the costume of a useful column.
//
// What it MAY do, and does:
//   - print each judge's ruling in its own column, as three peers;
//   - say whether the three DIFFER. That is a property of the panel, not a
//     result derived from it: it carries no margin and answers nothing about
//     the case. docs/01-spec.md §4 already lists divergence as reported and
//     never enforced;
//   - tally ONE judge's rulings ACROSS runs. That is variance in a single
//     method over repetitions, which is the measurement this tool exists for.
//     It never crosses the three judges within a run.
//
// The distinction that matters: across runs, per judge = variance. Across
// judges, within a run = a verdict. The first is evidence; the second is
// forbidden.

import { loadDeliberations } from '../src/persist.js';

const JUDGES = ['barak_model', 'elon_model', 'shamgar_model'];
const SHORT = { barak_model: 'barak', elon_model: 'elon', shamgar_model: 'shamgar' };
const R = { justified: 'just', not_justified: 'NOT', undefined: '—' };

const runs = loadDeliberations();

if (runs.length === 0) {
  console.log('No stored deliberations yet.');
  console.log('Run one:  npm run deliberate -- T-001 --provider openrouter');
  process.exit(0);
}

const pad = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

// A run's identity for comparison is its whole per-role allocation. Grouping
// mixed-model runs under one model string would put unlike things in one
// bucket and call the result variance.
const describeModels = (d) => {
  const m = d.model_map;
  if (!m) return d.model ?? d.provider;
  const distinct = [...new Set(Object.values(m).filter(Boolean))];
  if (distinct.length === 0) return d.model ?? d.provider;
  if (distinct.length === 1) return distinct[0];
  return `mixed: ${Object.entries(m)
    .map(([role, model]) => `${role.split('.')[1]}=${model}`)
    .join(', ')}`;
};


// ---------------------------------------------------------------- per run

console.log('');
console.log(bold(`${runs.length} stored deliberation${runs.length === 1 ? '' : 's'}`));
console.log('');
console.log(
  dim(
    pad('when', 17) +
      pad('model', 30) +
      pad('json', 7) +
      pad('status', 9) +
      pad('calls', 8) +
      pad('barak', 7) +
      pad('elon', 7) +
      pad('shamgar', 8) +
      pad('differ', 8) +
      pad('tok in/out', 13),
  ),
);
console.log(dim('─'.repeat(114)));

for (const d of runs) {
  const byId = new Map(d.judge_opinions.map((o) => [o.judge_id, o]));
  const rulings = JUDGES.map((j) => byId.get(j)?.ruling);
  const present = rulings.filter(Boolean);
  const differ =
    present.length < 2 ? '—' : new Set(present).size > 1 ? 'yes' : 'no';

  console.log(
    pad(d.ran_at.slice(5, 16).replace('T', ' '), 17) +
      pad(describeModels(d), 30) +
      pad(d.json_mode ?? '—', 7) +
      pad(d.status, 9) +
      // How many of the seven landed. The most informative column on the row:
      // a `partial` run still prints rulings that read as complete, and the
      // failure count is the only thing saying how much of the panel produced
      // them. This column was missing from the first version of this tool and
      // its absence hid a 25% call-failure rate for four runs.
      pad(`${d.usage?.succeeded ?? '?'}/${d.usage?.attempted ?? '?'}`, 8) +
      pad(R[rulings[0]] ?? '—', 7) +
      pad(R[rulings[1]] ?? '—', 7) +
      pad(R[rulings[2]] ?? '—', 8) +
      pad(differ, 8) +
      pad(`${d.usage?.tokens_in ?? 0}/${d.usage?.tokens_out ?? 0}`, 13),
  );
}

// ---------------------------------------------- variance, per judge, per config

console.log('');
console.log(bold('Variance — one judge across repetitions of the same config'));
console.log(dim('Never across the three judges within a run. See the header of this file.'));
console.log('');

const groups = new Map();
for (const d of runs) {
  const key = `${describeModels(d)} · json:${d.json_mode ?? '—'}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(d);
}

for (const [key, ds] of groups) {
  const attempted = ds.reduce((a, d) => a + (d.usage?.attempted ?? 0), 0);
  const failed = ds.reduce((a, d) => a + (d.usage?.failed ?? 0), 0);
  const rate = attempted ? Math.round((failed / attempted) * 100) : 0;

  console.log(`${bold(key)}  ${dim(`${ds.length} run${ds.length === 1 ? '' : 's'}`)}`);
  console.log(
    `  ${pad('calls', 9)} ${failed} of ${attempted} failed (${rate}%)` +
      (rate >= 10
        ? dim('  ← a panel this incomplete cannot support a comparison')
        : ''),
  );
  if (ds.length < 3) {
    console.log(
      dim(
        '  Fewer than 3 runs at temperature 0.7 — any difference here is not yet',
      ),
    );
    console.log(dim('  distinguishable from noise. Repeat before concluding anything.'));
  }
  for (const j of JUDGES) {
    const counts = {};
    for (const d of ds) {
      const o = d.judge_opinions.find((x) => x.judge_id === j);
      const k = o ? o.ruling : 'failed/absent';
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const line = Object.entries(counts)
      .map(([k, n]) => `${k} ×${n}`)
      .join(', ');
    console.log(`  ${pad(SHORT[j], 9)} ${line}`);
  }
  console.log('');
}

// ---------------------------------------------------------------- why calls failed

const failures = [];
for (const d of runs) {
  for (const f of [...(d.advocate_failures ?? []), ...(d.judge_failures ?? [])]) {
    failures.push({ run: d.ran_at.slice(5, 16).replace('T', ' '), ...f });
  }
}

if (failures.length) {
  console.log(bold('Why calls failed'));
  console.log(
    dim('A failure rate is a number; the reason is what tells you what to change.'),
  );
  console.log('');

  // Group by the reason, collapsing the variable parts so that twenty
  // instances of one cause read as one cause rather than twenty.
  const byReason = new Map();
  for (const f of failures) {
    const key = String(f.reason ?? 'unknown')
      .replace(/\d{3,}/g, 'N')
      .slice(0, 90);
    if (!byReason.has(key)) byReason.set(key, []);
    byReason.get(key).push(f);
  }

  for (const [reason, fs] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${bold(`×${fs.length}`)}  ${reason}`);
    console.log(dim(`        roles: ${fs.map((f) => f.roleId).join(', ')}`));
  }

  // Which seats and judges are actually losing calls. If the same role fails
  // every time, the cause is that role — its prompt, or its input size — not
  // the provider.
  const byRole = new Map();
  for (const f of failures) byRole.set(f.roleId, (byRole.get(f.roleId) ?? 0) + 1);
  console.log('');
  console.log(dim('  failures by role:'));
  for (const [role, n] of [...byRole].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pad(role, 22)} ×${n}`);
  }
  console.log('');
}

// ---------------------------------------------------------------- fact citations

console.log(bold('Fact citations — are the judges selecting, or filling the array?'));
console.log(
  dim('G3 can only fire if an opinion cites an index that does not exist.'),
);
console.log('');

const sets = new Map();
let opinionCount = 0;
for (const d of runs) {
  const n = d.case_snapshot?.agreed_facts?.length ?? 0;
  for (const o of d.judge_opinions) {
    opinionCount += 1;
    const key = `[${(o.relies_on_facts ?? []).join(',')}]`;
    if (!sets.has(key)) sets.set(key, { n: 0, all: (o.relies_on_facts ?? []).length === n });
    sets.get(key).n += 1;
  }
}
for (const [set, { n, all }] of [...sets].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`  ${pad(set, 24)} ${pad(`${n} of ${opinionCount} judge opinions`, 30)}${all ? dim('every fact in the case') : ''}`);
}
if (sets.size === 1 && [...sets.values()][0].all) {
  console.log('');
  console.log(
    dim('  One set, and it is every fact. The judges are filling the array,'),
  );
  console.log(dim('  not selecting from it — so G3 cannot fire on real output.'));
}

// ---------------------------------------------------------------- advocates

console.log('');
console.log(bold('Advocates — positions, and whether both cases were argued'));
console.log(
  dim('An advocate concluding against its own seat is permitted (decision 0004).'),
);
console.log(
  dim(
    'From turn 005 every advocate also argues `case_for_seat`, so both cases reach',
  ),
);
console.log(
  dim(
    'the judges even when the positions agree. `positions` below is what they',
  ),
);
console.log(dim('concluded; `cases` is whether both seats were actually argued.'));
console.log('');
for (const d of runs) {
  const positions = d.advocate_opinions.map((o) => `${o.representative_id}:${o.position}`);
  const distinct = new Set(d.advocate_opinions.map((o) => o.position));

  // Before turn 005 there was no case_for_seat, so a run in which every
  // advocate agreed genuinely put one side only. Distinguish the two eras
  // rather than reporting old runs as if the field had existed.
  const seatsArgued = new Set(
    d.advocate_opinions.filter((o) => o.case_for_seat).map((o) => o.seat),
  );
  const cases =
    seatsArgued.size === 0
      ? 'pre-005'
      : seatsArgued.size > 1
        ? 'both'
        : 'ONE SEAT';

  console.log(
    `  ${pad(d.ran_at.slice(5, 16).replace('T', ' '), 15)}` +
      `${pad(distinct.size > 1 ? 'positions differ' : 'positions agree', 18)}` +
      `${pad(`cases: ${cases}`, 16)}` +
      dim(positions.join('  ')),
  );
}
console.log('');
