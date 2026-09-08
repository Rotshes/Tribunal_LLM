// The Tribunal, as one screen.
//
// This is a PORT, not a redesign (turn 015). Every behaviour here was in the
// single-file page decision 0008 committed to, and the CSS moved verbatim, so
// that anything which looks different is a bug rather than a choice.
//
// What the components below must keep between them:
//   · three rulings, side by side, never combined                (0002)
//   · a failed call shown as a failure, never as silence
//   · the model list comes from the server, which also validates it
//   · the run is asynchronous; the page polls the archive for it  (0011)

import { useCallback, useEffect, useState } from 'react';

import {
  awaitResult,
  convene,
  fetchArchive,
  fetchCase,
  fetchModels,
  fetchRun,
  validateSheet,
} from './api.js';
import { describeModels } from './panel.js';

import Advocates from './components/Advocates.jsx';
import Archive from './components/Archive.jsx';
import Banner from './components/Banner.jsx';
import ChargeSheet from './components/ChargeSheet.jsx';
import ChargeSheetForm from './components/ChargeSheetForm.jsx';
import ModelPicker from './components/ModelPicker.jsx';
import Rulings from './components/Rulings.jsx';
import Waiting from './components/Waiting.jsx';

export default function App() {
  const [charge, setCharge] = useState(null);
  const [models, setModels] = useState(null);
  const [chosen, setChosen] = useState({});

  // The case on file, kept separately from `charge` so that switching back to
  // it after writing a charge sheet does not need a second fetch — and so the
  // fixture cannot be mutated by anything the form does.
  const [fileCharge, setFileCharge] = useState(null);
  const [mode, setMode] = useState('file'); // 'file' | 'own'
  const [ownSheet, setOwnSheet] = useState(null); // set only once G1 has passed
  const [formProblems, setFormProblems] = useState([]);
  const [suggestedCaseId, setSuggestedCaseId] = useState(null);
  const [checking, setChecking] = useState(false);

  const [runningSince, setRunningSince] = useState(null);
  const [doc, setDoc] = useState(null);
  const [retrieved, setRetrieved] = useState(false);
  const [error, setError] = useState(null);

  const [runs, setRuns] = useState(null);
  const [archiveError, setArchiveError] = useState(null);
  const [opening, setOpening] = useState(null);

  const loadArchive = useCallback(async () => {
    try {
      setArchiveError(null);
      setRuns(await fetchArchive());
    } catch (err) {
      // Shown, not swallowed. An archive that is silently empty because the
      // database is unreachable reads as "nothing has ever run here" — and the
      // database does pause itself; see docs/PRE-SUBMISSION.md.
      setArchiveError(err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const c = await fetchCase();
        setFileCharge(c);
        setCharge(c);
        setModels(await fetchModels());
      } catch (err) {
        setError({ title: err.message });
      }
    })();
    loadArchive();
  }, [loadArchive]);

  /**
   * Check a written charge sheet, and on success make it the active case.
   *
   * Submitting does NOT start a deliberation. It validates, and a sheet that
   * passes becomes the case shown above the panel picker — so the submitter
   * reads back what the models will be given and presses Convene themselves.
   * Definition-of-done item 7 wants the rejection message; nobody wants seven
   * paid calls as the way of finding out the sheet was accepted.
   */
  async function submitOwnSheet(sheet) {
    setChecking(true);
    setFormProblems([]);
    setError(null);
    try {
      await validateSheet(sheet);
      setOwnSheet(sheet);
      setCharge(sheet);
      setSuggestedCaseId(null);
      document.getElementById('the-panel')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      // Every violation at once, against the fields that caused them. G1
      // reports all of them for exactly this reason.
      setFormProblems(err.problems?.length ? err.problems : [err.message]);
      setSuggestedCaseId(err.suggestedCaseId ?? null);
      setOwnSheet(null);
    } finally {
      setChecking(false);
    }
  }

  function chooseMode(next) {
    setMode(next);
    setError(null);
    setFormProblems([]);
    // Switching away from a written sheet restores the fixture rather than
    // leaving the picker pointed at a case the page is no longer showing.
    setCharge(next === 'own' ? ownSheet : fileCharge);
  }

  const resetModels = () => setChosen({});
  const chooseModel = (role, id) => setChosen((prev) => ({ ...prev, [role]: id }));

  async function run() {
    setError(null);
    setDoc(null);
    setRetrieved(false);
    setRunningSince(Date.now());

    try {
      const models_ = { ...models.defaults, ...chosen };
      // A submitted sheet is sent whole; a fixture is sent by id. `ownSheet` is
      // set only after /api/validate has returned 200, so nothing that failed
      // G1 can reach this line.
      const id = await convene({
        caseId: charge.case_id,
        chargeSheet: mode === 'own' ? ownSheet : null,
        models: models_,
      });
      const result = await awaitResult(id);

      if (!result) {
        // Nothing was recorded. The run either crashed before writing or is
        // still going — said as two possibilities rather than one guess,
        // because the page genuinely cannot tell them apart. A background
        // function answers 202 before any of its error paths run, so its
        // failures reach the function log and not this screen. (0011)
        setError({
          title: 'No result was recorded.',
          lines: [
            `Nothing has appeared for run ${id} after four minutes.`,
            'The deliberation may still be running — it has up to fifteen minutes — so reload the page and look in Past proceedings before assuming it failed.',
            'If it never appears, the run failed before it could be written, and the reason is in the Netlify function log for `deliberate`.',
          ],
        });
        return;
      }

      setDoc(result);
      if (result.status !== 'complete') {
        const u = result.usage ?? {};
        setError({
          title: 'Some of the tribunal did not sit.',
          lines: [
            `${u.failed} of ${u.attempted} calls failed. What is shown below is incomplete.`,
          ],
        });
      }
      loadArchive(); // the run just held is now a past proceeding
    } catch (err) {
      setError({
        title: err.message,
        lines: [err.detail, 'The run was refused before it began.'].filter(Boolean),
      });
    } finally {
      setRunningSince(null);
    }
  }

  async function openRun(id) {
    setOpening(id);
    setError(null);
    try {
      const result = await fetchRun(id);
      setDoc(result);
      setRetrieved(true);
      if (result.status !== 'complete') {
        const u = result.usage ?? {};
        setError({
          title: 'This proceeding was incomplete when it was held.',
          lines: [
            `${u.failed} of ${u.attempted} calls failed. What is shown is what there was.`,
          ],
        });
      }
    } catch (err) {
      setError({ title: 'That proceeding could not be opened.', lines: [err.message] });
    } finally {
      setOpening(null);
    }
  }

  const usage = doc?.usage ?? {};
  const runline = doc
    ? `${retrieved ? 'retrieved · ' : ''}run ${doc.deliberation_id} · ${doc.status} · ` +
      `${usage.succeeded ?? 0}/${usage.attempted ?? 0} calls · ` +
      (retrieved
        ? `${describeModels(doc)} · held ${String(doc.ran_at ?? '').slice(0, 16).replace('T', ' ')}`
        : `${usage.tokens_in ?? 0} in / ${usage.tokens_out ?? 0} out · ${describeModels(doc)}`)
    : '';

  return (
    <>
      <header>
        <div className="wrap">
          <p className="eyebrow">In the Tribunal · a fictional proceeding</p>
          <h1>The Tribunal</h1>
          <p className="sub">
            Four advocates argue. Three judges rule, each by a different judicial
            method, each having read exactly the same arguments. The three rulings
            are reported side by side and are never combined.
          </p>
        </div>
      </header>

      <main className="wrap">
        <section>
          <h2 data-part="Part I">The charge sheet</h2>
          <p className="note">
            A case is a specification, not free text. It is validated before any
            model is called, and a charge sheet that fails costs nothing.
          </p>

          {/* Two ways in. The case on file is what a visitor with no case of
              their own should press; writing one is definition-of-done item 1,
              and it has to be discoverable without being explained. */}
          <div className="modes" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'file'}
              onClick={() => chooseMode('file')}
              disabled={Boolean(runningSince)}
            >
              The case on file
            </button>
            <button
              role="tab"
              aria-selected={mode === 'own'}
              onClick={() => chooseMode('own')}
              disabled={Boolean(runningSince)}
            >
              Write a charge sheet
            </button>
          </div>

          {mode === 'own' && !ownSheet && (
            <ChargeSheetForm
              onSubmit={submitOwnSheet}
              busy={checking}
              problems={formProblems}
              suggestedCaseId={suggestedCaseId}
            />
          )}

          {mode === 'own' && ownSheet && (
            <p className="accepted">
              Accepted. This is what the seven models will be given — read it
              back, then convene.{' '}
              <button
                type="button"
                className="linkish"
                onClick={() => { setOwnSheet(null); setCharge(fileCharge); }}
              >
                Write a different one
              </button>
            </p>
          )}

          {(mode === 'file' || ownSheet) && <ChargeSheet charge={charge} />}

          <div id="the-panel" />

          <ModelPicker
            charge={charge}
            models={models}
            chosen={chosen}
            onChange={chooseModel}
            onReset={resetModels}
          />

          {/* The one action, and it should not have to be looked for. Its own
              block, centred, the widest thing on the page until the rulings
              arrive — everything above it is preparation for pressing it. */}
          <div className="convene">
            <button onClick={run} disabled={!charge || !models || Boolean(runningSince)}>
              {runningSince ? 'The tribunal is sitting…' : 'Convene the tribunal'}
            </button>
            <span className="cost">
              Seven model calls · about 21 seconds on the committed allocation
            </span>
          </div>

          <Waiting since={runningSince} />

          <Banner title={error?.title} lines={error?.lines ?? []} />
        </section>

        {doc && (
          <section>
            <h2 data-part="Part II">The submissions</h2>
            <p className="note">
              Each advocate puts the case for its seat, whatever it personally
              concludes. None saw the others.
            </p>
            <Advocates doc={doc} charge={charge} />

            <h2 data-part="Part III">The rulings</h2>
            <p className="note">Three judges. Identical input. None saw the others.</p>
            <Rulings doc={doc} />

            <p className="protocol">
              These opinions are reported separately. The Tribunal produces no
              majority, headline, score or single result — the disagreement is the
              output.
            </p>
            <p className="runline">{runline}</p>
          </section>
        )}

        <section id="archive-section">
          <h2 data-part="Register">Past proceedings</h2>
          <p className="note">
            Every deliberation this Tribunal has held, most recent first. Open any
            of them to read the arguments and the three rulings as they were
            given. Nothing here is a summary.
          </p>
          <Archive
            runs={runs}
            error={archiveError}
            onOpen={openRun}
            opening={opening}
          />
        </section>
      </main>
    </>
  );
}
