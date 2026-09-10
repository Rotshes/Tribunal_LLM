# Turn 029 — Live at a public address

Date: 10 September 2026
Branch / commit: `main`, deployed. Netlify builds were paused from 08.09 until
this one.

## 1. Intent

The last item in `docs/PRE-SUBMISSION.md`: deploy the current `main`, and check
the definition of done **at the public address**, in a browser that is not
logged in. Everything before this turn was true in a repository.

## 2. Specification

- The deployed site is the newest commit, proved by something only it has.
- Definition of done 1, 2 and 3 demonstrated live, by a visitor with no
  account and no instructions.
- The run that demonstrates it is filed as evidence.

## 3. Context supplied

`docs/PRE-SUBMISSION.md`, and the deployed site.

## 4. Plan

Wake Supabase → deploy → private window → convene → file the run.

## 5. Execution

### Verified live

| | |
|---|---|
| Newest commit | the Light/Dark/System control in the masthead, which only recent commits have |
| No submission path | no *Write a charge sheet* tab — turn 027 |
| The committed allocation | seven seats, seven models, shown in the picker |
| **DoD 1** | a visitor convened T-001 and read the opinions, unprompted |
| **DoD 2** | three rulings side by side — Barak `justified`, Elon and Shamgar `not_justified` — with no majority, headline or score anywhere |
| **DoD 3** | the run appears in Past proceedings for someone who did not hold it |

**Run `00ed23ed-865d-42e6-9eaa-1923dcce5324` · complete · 7/7 · 27,189 in /
18,028 out.** The first production run on the allocation decision 0013 finally
settled on, and the panel divided.

Filed as `docs/evidence/029-live-run-after-deploy.json`, fetched from
`/api/runs?id=` — the deliberation as the database holds it, which is what a
stranger retrieving it would get.

### Two things that looked like defects and were not

**A stale `/api/models`.** The picker first showed six models and the old
two-model allocation — the turn-017 response. `/api/models` sets
`Cache-Control: max-age=300`, and the browser had a copy from before builds were
paused. Fetching the endpoint directly proved the deployed function correct;
a hard reload fixed the page.

Recorded because of how it reads: identical to a deploy where the functions did
not rebuild. It cannot happen to the instructor, who has no cached copy — but
**it will happen to anyone re-checking their own deploy**, which is exactly the
moment a person concludes the deploy failed. After any deploy, give it five
minutes or hard-reload before judging what you see.

**Empty bullets under `Concedes` and `Answers to the advocates`.** An artifact of
copying the page as text: those sections are `<details>` elements, collapsed by
default, so the summaries and list markers copied and the hidden text did not.
The counts matched the arrays. Nothing was wrong.

Both are worth a paragraph for the same reason: at the end of a project, the
cost of misreading a healthy system as a broken one is a change nobody needed,
made in a hurry, on the deploy you only get once.

## 6. Verification

The site was opened in a private window — not logged in, no history — and
nothing on it was explained to the person using it. That is the wording of
definition-of-done item 1 and the only way to test it.

`npm test`, `npm run check` and the pre-commit hook all pass on the commit that
was deployed.

### Not verified

- **One run.** The production allocation has 4 complete runs locally and this
  one live. Nothing here says it is reliable, only that it worked.
- **The generic advocate prompt has still never run on a real model**, and after
  turn 027 it cannot: no submitted cases exist and no second fixture does. It
  stays because decision 0003 says T-001 is the first of several and a second
  fixture would reach it. Until then it is untested code kept on an argument
  about the future, which is worth saying plainly.
- Whether Supabase stays awake. It pauses after seven quiet days; this visit
  reset that clock, and the clock starts again now.

## 7. Outcome

The Tribunal is live, current, and demonstrated at a public address by a
stranger's browser.

What remains is not this repository: the independent project's three spiral
turns, and the engagement emails. Both are worth more marks than anything left
here, and neither depends on it.
