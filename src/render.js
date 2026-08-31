// Terminal display.
//
// The three rulings are peers. There is no headline, no summary line, no
// count of who agreed with whom. A failed judge is shown as a failure in the
// same row of the display as the two that succeeded, so that two rulings are
// never presented as the outcome.

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';

const rule = (ch = '─', n = 78) => ch.repeat(n);

function wrap(text, width) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if ((line + ' ' + word).trim().length > width) {
        out.push(line.trim());
        line = word;
      } else {
        line += ' ' + word;
      }
    }
    out.push(line.trim());
  }
  return out;
}

export function render(result, caseObj) {
  const L = [];

  L.push('');
  L.push(`${BOLD}${caseObj.title}${RESET}  ${DIM}${caseObj.case_id}${RESET}`);
  L.push(rule('═'));
  L.push(...wrap(caseObj.issue, 78));
  L.push('');
  L.push(`${DIM}${caseObj.scope.note}${RESET}`);
  L.push(rule('═'));

  if (result.status === 'failed' && result.failed_gate === 'G1') {
    L.push('');
    L.push(`${RED}${BOLD}The charge sheet was rejected before any model was called.${RESET}`);
    for (const p of result.problems) L.push(`  ${RED}·${RESET} ${p}`);
    L.push('');
    L.push(`${DIM}No model calls were made. Nothing was spent.${RESET}`);
    return L.join('\n');
  }

  // --- Advocates
  L.push('');
  L.push(`${BOLD}THE ARGUMENTS${RESET} ${DIM}(four advocates, argued in parallel, none saw the others)${RESET}`);
  L.push('');
  for (const o of result.advocate_opinions) {
    const against =
      (o.seat === 'defense' && o.position === 'not_justified') ||
      (o.seat === 'prosecution' && o.position === 'justified');
    L.push(
      `  ${BOLD}${o.representative_id}${RESET} ${DIM}(${o.seat} seat)${RESET} → ${o.position}` +
        (against ? `  ${DIM}← concluded against own seat; permitted${RESET}` : ''),
    );
    for (const k of o.key_points.slice(0, 3)) {
      L.push(...wrap(`      · ${k}`, 76));
    }
    L.push(`      ${DIM}cites facts [${o.relies_on_facts.join(', ')}]${RESET}`);
    L.push('');
  }
  for (const f of result.advocate_failures ?? []) {
    L.push(`  ${RED}${BOLD}${f.roleId} — FAILED${RESET}`);
    L.push(...wrap(`      ${f.reason}`, 76));
    L.push(`      ${DIM}This seat argued nothing. The judges were told so.${RESET}`);
    L.push('');
  }

  // --- Judges
  L.push(rule('═'));
  L.push(`${BOLD}THE RULINGS${RESET} ${DIM}(three judges, identical input, none saw the others)${RESET}`);
  L.push('');

  const cells = [];
  for (const id of ['barak_model', 'elon_model', 'shamgar_model']) {
    const o = result.judge_opinions.find((x) => x.judge_id === id);
    const f = (result.judge_failures ?? []).find((x) => x.roleId === id);
    cells.push({ id, o, f });
  }

  for (const { id, o, f } of cells) {
    L.push(rule('─'));
    if (f) {
      L.push(`${RED}${BOLD}${id} — DELIBERATION FAILED${RESET}`);
      L.push(...wrap(f.reason, 76));
      L.push(
        `${DIM}No ruling from this judge. This is a failure, not an acquittal,${RESET}`,
      );
      L.push(`${DIM}and the other rulings are not the outcome of the case.${RESET}`);
      L.push('');
      continue;
    }
    L.push(`${BOLD}${id}${RESET}  ${DIM}${o.method}${RESET}`);
    L.push(`${BOLD}RULING: ${o.ruling.replace('_', ' ')}${RESET}`);
    L.push('');
    for (const g of o.grounds) L.push(...wrap(`  · ${g}`, 76));
    L.push('');
    L.push(`  ${DIM}answers: ${o.responds_to.map((r) => r.representative_id).join(', ')}${RESET}`);
    L.push(`  ${DIM}cites facts [${o.relies_on_facts.join(', ')}]${RESET}`);
    L.push(`  ${DIM}${o.disclaimer}${RESET}`);
    L.push('');
  }

  L.push(rule('═'));
  L.push(
    `${DIM}These opinions are reported separately. The Tribunal does not combine them,${RESET}`,
  );
  L.push(
    `${DIM}and produces no majority, headline, score, or single result.${RESET}`,
  );

  // --- Run record
  const s = result.log.summary({ wall_ms: result.wall_ms ?? null });
  L.push('');
  L.push(`${BOLD}RUN${RESET}  ${DIM}${result.deliberation_id}${RESET}`);
  L.push(
    `  status: ${result.status} · calls attempted: ${s.attempted} · succeeded: ${s.succeeded} · failed: ${s.failed}`,
  );
  L.push(
    `  tokens in/out: ${s.tokens_in}/${s.tokens_out}`,
  );
  L.push(
    `  ${BOLD}waited: ${(s.wall_ms / 1000).toFixed(1)}s${RESET}` +
      `${DIM}  ·  model time (sum of 7 calls): ${(s.model_time_ms / 1000).toFixed(1)}s` +
      `  ·  concurrency gain: ${s.concurrency_gain}×${RESET}`,
  );
  if (result.reported) {
    L.push(
      `  ${DIM}reported, not gated — advocates concluding against their seat: ${
        result.reported.seat_divergence.length
          ? result.reported.seat_divergence.join(', ')
          : 'none'
      } · advocates conceding something: ${result.reported.concessions_made}/4${RESET}`,
    );
  }
  if (result.gate_problems?.length) {
    L.push('');
    for (const p of result.gate_problems) L.push(`  ${RED}GATE: ${p}${RESET}`);
  }
  if (result.cap_error) L.push(`  ${RED}GATE: ${result.cap_error}${RESET}`);

  return L.join('\n');
}
