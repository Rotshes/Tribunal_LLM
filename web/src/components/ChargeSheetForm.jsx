// Submitting a charge sheet. Definition-of-done item 1, and item 7 with it.
//
// The backend has accepted an inline charge sheet since turn 011 and nothing
// ever sent one, which is why the grading map read PARTIAL for eleven turns.
// This is the missing half.
//
// THREE RULES THIS FORM FOLLOWS, and each one removes a whole class of failure
// rather than reporting it:
//
//  1. It does not offer what the project forbids. `scope.imposes_sentence`,
//     `scope.combines_opinions` and `fictional` are constants the schema pins
//     (docs/02-charge-sheet-spec.md). A field that can only be filled in one way
//     is not a question; it is a trap with one right answer. They are asserted
//     and shown, not edited.
//  2. Seats are fixed 2 defense / 2 prosecution. G1 requires exactly that
//     balance, so a seat dropdown exists only to be got wrong.
//  3. Bounds are shown while typing. `background` is 200-400 WORDS and a brief
//     is 100-1200 characters; both are invisible constraints that a submitter
//     discovers by being rejected. The counters are advisory — the server's G1
//     is what decides — but they mean the server rarely has to say no.
//
// The counters restate bounds that live in the schema, which this project has
// been bitten by four times (CLAUDE.md, "two statements of one contract drift").
// A test asserts these numbers against schemas/charge-sheet.schema.json rather
// than trusting them to stay in step.

import { useState } from 'react';

// Mirrored from schemas/charge-sheet.schema.json. Checked by test, not by hope.
export const BOUNDS = {
  title: { min: 3, max: 120 },
  act_alleged: { min: 20, max: 400 },
  issue: { min: 40, max: 500 },
  background_words: { min: 200, max: 400 },
  fact: { min: 20, max: 500 },
  facts: { min: 3, max: 12 },
  brief: { min: 100, max: 1200 },
};

const SEATS = ['defense', 'defense', 'prosecution', 'prosecution'];

const EMPTY = {
  case_id: '',
  title: '',
  accused: '',
  affected_party: '',
  act_alleged: '',
  issue: '',
  background: '',
  agreed_facts: ['', '', ''],
  representatives: SEATS.map((seat) => ({ id: '', name: '', seat, brief: '' })),
  provenance: { source: '', received: new Date().toISOString().slice(0, 10), disclaimer: '' },
};

// The constants. Asserted on submit, displayed above, never editable.
const PINNED = {
  fictional: true,
  scope: {
    decides: ['justified', 'not_justified'],
    imposes_sentence: false,
    combines_opinions: false,
    note: 'The Tribunal decides justified / not justified and gives reasons. It does not impose a sentence, and it does not combine the three opinions into one verdict.',
  },
};

const words = (s) => (String(s).trim() ? String(s).trim().split(/\s+/).length : 0);

/** An id the schema will accept, derived from a name the submitter typed. */
const slug = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([^a-z])/, 'p_$1')
    .slice(0, 41);

function Counter({ value, min, max, unit = 'characters' }) {
  const n = unit === 'words' ? words(value) : String(value).length;
  const ok = n >= min && n <= max;
  return (
    <span className="counter" data-ok={ok ? 'yes' : 'no'}>
      {n} / {min}–{max} {unit}
    </span>
  );
}

export default function ChargeSheetForm({ onSubmit, busy, problems, suggestedCaseId }) {
  const [f, setF] = useState(EMPTY);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setRep = (i, k, v) =>
    setF((p) => ({
      ...p,
      representatives: p.representatives.map((r, j) => (j === i ? { ...r, [k]: v } : r)),
    }));
  const setFact = (i, v) =>
    setF((p) => ({ ...p, agreed_facts: p.agreed_facts.map((x, j) => (j === i ? v : x)) }));

  const addFact = () =>
    setF((p) =>
      p.agreed_facts.length >= BOUNDS.facts.max
        ? p
        : { ...p, agreed_facts: [...p.agreed_facts, ''] },
    );

  // Removing the LAST entry only. Removing from the middle would renumber every
  // fact after it, and opinions cite by index — the schema comment calls that
  // out as silently invalidating stored opinions. Nothing has cited a fact on a
  // sheet that has not been submitted yet, so this is strictly a habit; it is
  // the habit the rest of the project is built on.
  const dropLastFact = () =>
    setF((p) =>
      p.agreed_facts.length <= BOUNDS.facts.min
        ? p
        : { ...p, agreed_facts: p.agreed_facts.slice(0, -1) },
    );

  function submit(e) {
    e.preventDefault();
    const sheet = {
      ...PINNED,
      case_id: f.case_id.trim(),
      title: f.title.trim(),
      accused: f.accused.trim(),
      affected_party: f.affected_party.trim(),
      act_alleged: f.act_alleged.trim(),
      issue: f.issue.trim(),
      background: f.background.trim(),
      agreed_facts: f.agreed_facts.map((x) => x.trim()).filter(Boolean),
      representatives: f.representatives.map((r) => ({
        id: r.id.trim() || slug(r.name),
        name: r.name.trim(),
        seat: r.seat,
        brief: r.brief.trim(),
      })),
      provenance: {
        source: f.provenance.source.trim(),
        received: f.provenance.received,
        disclaimer: f.provenance.disclaimer.trim(),
      },
    };
    onSubmit(sheet);
  }

  return (
    <form className="sheet-form" onSubmit={submit}>
      <p className="note">
        Every field below is checked before a single model is called, and a
        rejected charge sheet costs nothing. The counters are a courtesy; the
        server decides.
      </p>

      <fieldset>
        <legend>Identity</legend>
        <label>
          Cause number
          <input
            value={f.case_id}
            onChange={(e) => set('case_id', e.target.value)}
            placeholder={suggestedCaseId ?? 'T-002'}
            pattern="T-\d{3}"
            required
          />
          <small>
            Format <code>T-nnn</code>.{' '}
            {suggestedCaseId ? `${suggestedCaseId} is free.` : 'Must not already exist.'}
          </small>
        </label>
        <label>
          Title
          <input value={f.title} onChange={(e) => set('title', e.target.value)} required />
          <small>
            Style: <em>Party v. Accused</em>.{' '}
            <Counter value={f.title} {...BOUNDS.title} />
          </small>
        </label>
      </fieldset>

      <fieldset>
        <legend>The act, and the question</legend>
        <div className="pair">
          <label>
            Accused
            <input value={f.accused} onChange={(e) => set('accused', e.target.value)} required />
            <small>The person whose act is judged.</small>
          </label>
          <label>
            Affected party
            <input
              value={f.affected_party}
              onChange={(e) => set('affected_party', e.target.value)}
              required
            />
            <small>The person the act was done to.</small>
          </label>
        </div>
        <label>
          The act alleged
          <textarea
            rows={3}
            value={f.act_alleged}
            onChange={(e) => set('act_alleged', e.target.value)}
            required
          />
          <small>
            One act, stated as fact, without characterisation. &ldquo;Killed X by
            stabbing her during a private meeting&rdquo; is an act; &ldquo;brutally
            murdered X&rdquo; is an argument.{' '}
            <Counter value={f.act_alleged} {...BOUNDS.act_alleged} />
          </small>
        </label>
        <label>
          The issue
          <textarea rows={4} value={f.issue} onChange={(e) => set('issue', e.target.value)} required />
          <small>
            The exact question, phrased so it can be answered <em>justified</em> or{' '}
            <em>not justified</em> and no other way. It names the considerations and
            does not hint which way they cut.{' '}
            <Counter value={f.issue} {...BOUNDS.issue} />
          </small>
        </label>
      </fieldset>

      <fieldset>
        <legend>Context</legend>
        <label>
          Background
          <textarea
            rows={10}
            value={f.background}
            onChange={(e) => set('background', e.target.value)}
            required
          />
          <small>
            Written for a reader who does not know the story. Narrative, not
            argument — without it the models fill the gap from memory, which is
            the hallucination path.{' '}
            <Counter value={f.background} {...BOUNDS.background_words} unit="words" />
          </small>
        </label>

        <div className="facts-edit">
          <p className="legend-ish">The agreed record</p>
          <small>
            A proposition <strong>both seats accept</strong>. If either side would
            contest it, it belongs to an advocate, not here. Opinions cite these by
            number, so <strong>the order is permanent</strong> — a correction
            appends, it never rewrites or reorders.
          </small>
          {f.agreed_facts.map((fact, i) => (
            <label key={i}>
              <span className="fact-n">[{i}]</span>
              <textarea rows={2} value={fact} onChange={(e) => setFact(i, e.target.value)} />
              <small>
                <Counter value={fact} {...BOUNDS.fact} />
              </small>
            </label>
          ))}
          <div className="fact-buttons">
            <button
              type="button"
              className="linkish"
              onClick={addFact}
              disabled={f.agreed_facts.length >= BOUNDS.facts.max}
            >
              Add a fact
            </button>
            <button
              type="button"
              className="linkish"
              onClick={dropLastFact}
              disabled={f.agreed_facts.length <= BOUNDS.facts.min}
            >
              Remove the last
            </button>
            <span className="counter" data-ok={f.agreed_facts.length >= BOUNDS.facts.min ? 'yes' : 'no'}>
              {f.agreed_facts.length} / {BOUNDS.facts.min}–{BOUNDS.facts.max} facts
            </span>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>The representatives</legend>
        <small>
          Exactly four, two per seat — so the seats are fixed here rather than
          offered. <strong>The seat fixes the procedural role only.</strong> Nothing
          requires an advocate to conclude in favour of its own seat, and none of
          them will be made to.
        </small>
        {f.representatives.map((r, i) => (
          <div className="rep-edit" key={i}>
            <p className="seat">{r.seat}</p>
            <label>
              Name
              <input value={r.name} onChange={(e) => setRep(i, 'name', e.target.value)} required />
              <small>Identifier: <code>{r.id.trim() || slug(r.name) || '—'}</code></small>
            </label>
            <label>
              Brief
              <textarea
                rows={5}
                value={r.brief}
                onChange={(e) => setRep(i, 'brief', e.target.value)}
                required
              />
              <small>
                Manner of reasoning, values, and distortions — the material the
                prompt is built from. <Counter value={r.brief} {...BOUNDS.brief} />
              </small>
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Provenance</legend>
        <div className="pair">
          <label>
            Source
            <input
              value={f.provenance.source}
              onChange={(e) => set('provenance', { ...f.provenance, source: e.target.value })}
              required
            />
          </label>
          <label>
            Received
            <input
              type="date"
              value={f.provenance.received}
              onChange={(e) => set('provenance', { ...f.provenance, received: e.target.value })}
              required
            />
          </label>
        </div>
        <label>
          Disclaimer
          <textarea
            rows={2}
            value={f.provenance.disclaimer}
            onChange={(e) => set('provenance', { ...f.provenance, disclaimer: e.target.value })}
            required
          />
          <small>Travels with the case into every rendered page.</small>
        </label>
      </fieldset>

      <fieldset className="pinned">
        <legend>Fixed by the project</legend>
        <small>
          Not editable, and not editable on purpose: a form offering these as
          choices would be offering something this Tribunal does not do.
        </small>
        <ul>
          <li><code>fictional</code> — true. Every case this term is fictional.</li>
          <li><code>scope.decides</code> — justified / not justified. No third value.</li>
          <li><code>scope.imposes_sentence</code> — false. The Tribunal passes no sentence.</li>
          <li><code>scope.combines_opinions</code> — false. The three rulings are never combined.</li>
        </ul>
      </fieldset>

      {problems?.length > 0 && (
        <div className="banner" role="alert">
          <h3>The charge sheet was rejected — nothing was called, nothing was spent</h3>
          <ul>
            {problems.map((p, i) => (
              <li key={i}><code>{p}</code></li>
            ))}
          </ul>
        </div>
      )}

      <div className="convene">
        <button type="submit" disabled={busy}>
          {busy ? 'Checking the charge sheet…' : 'Submit the charge sheet'}
        </button>
        <span className="cost">
          Checked first · no model is called until it passes
        </span>
      </div>
    </form>
  );
}
