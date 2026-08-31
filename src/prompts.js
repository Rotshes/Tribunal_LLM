// Loading and assembling prompts.
//
// A prompt file is the graded artifact and the thing the model actually
// receives, so the two must not drift. The system message is taken verbatim
// from the file's "## System" section; the user message is assembled here from
// the case, matching the "## User (assembled by the backend)" block that each
// prompt documents.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { PROMPT_FILES, ADVOCATE_ORDER } from './config.js';

const cache = new Map();

export function loadPrompt(roleId) {
  if (cache.has(roleId)) return cache.get(roleId);

  const file = PROMPT_FILES[roleId];
  if (!file) throw new Error(`No prompt file registered for role "${roleId}"`);

  const raw = fs.readFileSync(file, 'utf8');

  // The declared version, and a hash of the whole file. Both are recorded on
  // every call row. The pairing catches the failure this convention invites:
  // editing the text without bumping the header. The hash changes, the version
  // does not, and the mismatch is visible in the log.
  const version = raw.match(/^version:\s*"?([0-9]+\.[0-9]+)"?\s*$/m)?.[1];
  if (!version) throw new Error(`${file} has no version in its front matter`);

  const sha256 = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');

  // Everything from "## System" up to the "## User" heading.
  const system = raw
    .split(/^## System\s*$/m)[1]
    ?.split(/^## User\b/m)[0]
    ?.trim();
  if (!system) throw new Error(`${file} has no "## System" section`);

  const prompt = { roleId, file, version, sha256, system };
  cache.set(roleId, prompt);
  return prompt;
}

const factList = (c) =>
  c.agreed_facts.map((f, i) => `[${i}] ${f}`).join('\n');

const caseHeader = (c) => `CASE: ${c.case_id} — ${c.title}
ACCUSED: ${c.accused}
AFFECTED PARTY: ${c.affected_party}
ACT ALLEGED: ${c.act_alleged}

BACKGROUND (context only, not citable):
${c.background}

AGREED FACTS (the only citable record; cite by index):
${factList(c)}

QUESTION FOR JUDGMENT:
${c.issue}

SCOPE:
${c.scope.note}`;

export function advocateUserMessage(caseObj, representativeId) {
  const rep = caseObj.representatives.find((r) => r.id === representativeId);
  if (!rep) throw new Error(`No representative "${representativeId}" in ${caseObj.case_id}`);
  return `${caseHeader(caseObj)}

YOU: ${rep.name} — ${rep.seat} seat (id: ${rep.id})`;
}

/**
 * All three judges get this same string. Byte-identical input into three
 * different methods is the only arrangement in which a divergent ruling is
 * attributable to method rather than to evidence. docs/01-spec.md §3.
 */
export function judgeUserMessage(caseObj, advocateOpinions) {
  const byId = new Map(advocateOpinions.map((o) => [o.representative_id, o]));
  const blocks = ADVOCATE_ORDER.map((id) => {
    const rep = caseObj.representatives.find((r) => r.id === id);
    const o = byId.get(id);
    if (!o) {
      return `--- ${rep.name} (${rep.seat} seat, id: ${id}) ---
THIS ADVOCATE FAILED TO PRODUCE AN ARGUMENT. Nothing was argued from this seat.
Do not supply the argument yourself; judge the case that was actually argued.`;
    }
    // The case for the seat comes FIRST and is labelled as the case to answer.
    // The advocate's own position follows, marked as possibly departing from
    // it. A judge that only read positions would, in three runs of five, have
    // seen no opposing argument at all — which is what turn 005 exists to fix.
    return `--- ${rep.name} (${rep.seat} seat, id: ${id}) ---
THE CASE FOR THE ${rep.seat.toUpperCase()} SEAT, as this advocate puts it:
${o.case_for_seat}

This advocate's own position: ${o.position}${
      (rep.seat === 'defense' && o.position === 'not_justified') ||
      (rep.seat === 'prosecution' && o.position === 'justified')
        ? '  (departs from the case above; the case still stands to be answered)'
        : ''
    }
key points:
${o.key_points.map((k) => `  - ${k}`).join('\n')}
concedes:
${(o.concedes ?? []).map((k) => `  - ${k}`).join('\n') || '  (nothing)'}

${o.argument}`;
  });

  return `${caseHeader(caseObj)}

ARGUMENTS BEFORE YOU (four advocates, fixed order — argument, not fact):
${blocks.join('\n\n')}`;
}
