// The panel, read from panel/judges.json.
//
// That file existed from turn 001 and nothing read it: the judges' methods and
// the disclaimer were also written into the prompts, and the disclaimer was
// additionally being requested FROM the model. Three copies of one string, and
// the model's copy came back paraphrased (turn 003).
//
// This module makes panel/judges.json the single source. The runner attaches
// the method and the disclaimer from here; the model supplies neither.

import fs from 'node:fs';
import path from 'node:path';

let cache = null;

function panel() {
  if (cache) return cache;
  cache = JSON.parse(
    fs.readFileSync(path.join('panel', 'judges.json'), 'utf8'),
  );
  return cache;
}

export function judgeIds() {
  return panel().judges.map((j) => j.id);
}

export function judgeMethod(id) {
  const j = panel().judges.find((x) => x.id === id);
  if (!j) throw new Error(`No judge "${id}" in panel/judges.json`);
  return j.method;
}

export function judgeLabel(id) {
  const j = panel().judges.find((x) => x.id === id);
  if (!j) throw new Error(`No judge "${id}" in panel/judges.json`);
  return j.label;
}

/**
 * The exact disclaimer text. Attached by the runner to every judge opinion and
 * compared by G6. It is a statement about named real people and it is not the
 * model's to reword. See docs/decisions/0005-judges-are-method-models-not-people.md.
 */
export function judgeDisclaimer() {
  return panel().disclaimer;
}
