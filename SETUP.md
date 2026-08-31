# Setup — the five accounts, and the one tool they all assume

Lesson 1, slide 7. Gorsky calls these recommendations, not requirements, but
they are what the course teaches against, so use them unless you have a reason.

Do these in order. The order is not arbitrary: each one unblocks the next.

*Revised 24.08.2026 — added Node (step 0), the concrete Windows steps, the
per-key spend limit, the model-choice constraint, and the corrected Supabase key
names. The original version predated the runner and named Supabase's legacy
keys, which are being deprecated.*

---

## 0. Node.js — the thing the other five assume

**What it is:** the JavaScript runtime. `npm` comes with it. Everything in this
repository — the seven calls, the gates, the tests — is JavaScript, so nothing
here runs until this is installed.

It is not on slide 7 because slide 7 lists *accounts*. It still blocks all of them.

1. nodejs.org → the **LTS** Windows Installer (`.msi`), 64-bit. LTS, not Current.
2. Accept the defaults. Leave *"automatically install the necessary tools for
   native modules"* **unchecked** — it pulls in Chocolatey, Python and the Visual
   Studio build tools, costs fifteen minutes and a reboot, and nothing here
   compiles native code.
3. **Close every terminal and open a new one.** The installer edits PATH and a
   running terminal never sees it. This is the usual reason step 4 appears to fail.
4. Verify: `node -v` and `npm -v`.
5. Then, from the project folder:

   ```
   npm install
   npm test        # expect 54 passing
   npm run check   # G5 and G8 over the repo
   npm run deliberate -- T-001 --stub good
   ```

`npm install` writes `node_modules/` (gitignored) and `package-lock.json`
(**commit this** — it pins exact dependency versions, and that reproducibility
is part of what is graded).

---

## 1. GitHub — the graded artifact

**What it is:** where your code lives online, and where every change is saved
as a numbered snapshot with a message attached.

**Why it matters most:** the course grades the record of how you directed the
agent. GitHub *is* that record. The app could be perfect and unrecorded and it
would not count — "only what I can open and verify in your repo counts."

1. Create an account at github.com.
2. Install `git` on your machine.
3. Create a repository named `tribunal`. Private is fine; you can add the
   instructor as a collaborator.
4. Set your commit identity so the history has your name on it:
   ```
   git config --global user.name "Your Name"
   git config --global user.email "your@email"
   ```

A commit message names the intent, not the diff. Get this habit right from
commit one — it is most of what he reads.

## 2. Claude Code — where the direction happens

**What it is:** the agent you direct, running in your terminal. The course
calls it an ADE, an agentic development environment (Module 5). It sits at
level 3 on the autonomy scale: you give it a goal, it plans, edits many files,
and runs commands before returning.

Install it, then run it from inside your `tribunal` folder — not from your home
directory. It reads `CLAUDE.md` upward through parent folders, so where you
start it decides what it knows.

Useful from day one:
- `/init` — writes a first draft `CLAUDE.md`. Correct it by hand afterwards;
  Module 11 found unreviewed generated context files *lose* about 3% while
  costing 20% more tokens.
- `/context` — shows where your token budget is actually going.
- `/clear` — start clean when the next task is unrelated to the last.

## 3. OpenRouter — one key for many models

**What it is:** a single account your backend calls instead of signing up with
every model provider separately. You get one API key and can switch models by
changing a string.

1. Create an account. **Credits** → add five to ten dollars. A full seven-call
   deliberation on a mid-priced model costs cents; the rest is headroom.
2. **Keys** → **Create Key**, and **set a credit limit on the key itself.**
   Two dollars is generous. `MAX_CALLS_PER_DELIBERATION` protects against a
   retry loop inside one run; the key limit protects against everything the code
   might do that nobody predicted. It is the only spend control that holds when
   the bug is in the control flow.
3. Copy the key immediately — it is shown once, and begins `sk-or-v1-`.
4. **You do not choose a model here.** The per-role allocation is committed in
   `modelMap()` in `src/config.js` and argued in decision 0009 — 3.7-flash on the
   four advocates, flash-lite on the three judges. Any model added to
   `panel/models.json` must support **structured / JSON output**: every prompt
   demands one JSON object and the provider sends
   `response_format: { type: "json_object" }` with `require_parameters`, so a
   model without it 404s, and one routed to an endpoint without it returns prose
   and fails at gate G2 — after charging for them.
5. **Put both in `.env`, never in the repo.** If a key ever lands in a commit it
   is public forever — bots scrape for key patterns within minutes. Rotate it;
   do not try to rewrite history, which costs you the commit trail as well.

Verify before your first push: `git check-ignore -v .env` must name
`.gitignore`, and `git status` must not mention `.env`. `npm run check` runs G8,
a secret scan over tracked files.

This is the only one that costs money per use, which is why Module 9 spends a
whole module on the economics of a single call.

## 4. Supabase — the database

**What it is:** your app's memory (Module 7). A Postgres database with a web
interface, plus authentication and file storage you are not using yet.

Create a project, name it `tribunal`, pick the nearest region (Frankfurt,
`eu-central-1`). It generates a **database password** shown once — save it. That
is a separate thing from the API keys.

**Settings → API Keys** has two tabs, and the distinction matters:

| Tab | Keys | Use |
|---|---|---|
| **API Keys** | `sb_publishable_…`, `sb_secret_…` | These. |
| **Legacy API Keys** | `anon`, `service_role` | Being deprecated by the end of 2026 — inside this project's lifetime. |

Keep the **Project URL** and the **secret** key (`sb_secret_…`). The secret key
bypasses row-level security: it goes in `.env` and in Netlify's environment
variables, and nowhere else. Same rule as the OpenRouter key.

*(`.env.example` said `SUPABASE_SERVICE_KEY` until 24.08.2026. That named the
legacy key. Corrected to `SUPABASE_SECRET_KEY`.)*

**Free-plan projects pause after seven days of low activity**, with a warning
email about a week ahead. No data is lost — you resume from the dashboard — but
the resume takes a few minutes, and opening the dashboard counts as activity.
Do not discover this the night before a demo.

## 5. Netlify — deployment

**What it is:** what puts your app at a real web address so someone else can
open it. Module 7: an app on your own machine is not yet reachable by anyone.

Connect it to your GitHub repository. After that, pushing to `main` deploys
automatically. Set your secrets in Netlify's environment variables, not in the code.

Remember what Module 7 says about why this layer earns respect: on your laptop
a mistake harms one person who can undo it; deployed, the same mistake reaches
everyone at once and keeps being served until someone notices.

### The actual steps

Nothing needs to be built or configured in the repository first — `netlify.toml`
is committed and complete, the frontend has no build step (decision 0008), and
the four functions are picked up from `netlify/functions/` automatically.

1. **Push everything first.** Netlify deploys what is on GitHub, not what is on
   your disk. `git status` should say up to date with origin.
2. netlify.com → **Add new site → Import an existing project** → GitHub → the
   `tribunal` repository.
3. When it asks for build settings, **accept what it reads from
   `netlify.toml`**: no build command, publish directory `web`, functions
   directory `netlify/functions`. If it offers to guess instead, decline.
4. **Site configuration → Environment variables.** Add exactly three:

   | Key | Value |
   |---|---|
   | `OPENROUTER_API_KEY` | the `sk-or-v1-…` key |
   | `SUPABASE_URL` | `https://<project>.supabase.co` |
   | `SUPABASE_SECRET_KEY` | the `sb_secret_…` key |

   **Not** `TRIBUNAL_UNIFORM_MODEL` — the per-role allocation is committed in
   `src/config.js` (decision 0009), and setting that variable in production
   would silently flatten the panel onto one model. It is a control-run switch,
   not a deployment setting.

   These are the same values as your `.env`, which is gitignored and never
   travels with the code. Nothing else in the file is needed in production.
5. **Deploy.** Then open the site and check four things, in this order:

   - the charge sheet renders (`/api/case` works — no secrets involved, so this
     failing means the functions did not deploy at all);
   - **Past proceedings** lists your existing runs (`/api/runs` works, so
     `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are right);
   - "Read it" on any past run opens three rulings;
   - **Convene the tribunal** completes (`OPENROUTER_API_KEY` is right, and the
     run fits inside Netlify's 60-second function limit).

   Do them in that order because each one that passes narrows what a later
   failure can mean.

### If the deliberation times out in production

Netlify's synchronous limit is **60 seconds and is not configurable** — see the
long comment in `netlify.toml`, which exists because a made-up `timeout = 26`
once killed every browser run. A deliberation on the committed allocation takes
about 21 seconds wall clock, so there is room; a slow model chosen for all seven
roles in the picker is what would eat it. The page reports the status rather
than a parse error, so a timeout will say so.

### After it is live

- Put the URL in `README.md`.
- Re-check definition of done items 1 and 3 **at the public address**, not on
  localhost. That is what those items actually say.
- Add the instructor as a collaborator on the repository if that is still open.

---

## Checklist

Blocking now:

- [x] GitHub account, git installed, commit identity set
- [x] `tribunal` repository created
- [ ] Instructor added as a collaborator
- [ ] **Node LTS installed**, `node -v` works in a fresh terminal
- [ ] `npm install` run; `npm test` passes (54 tests); `package-lock.json` committed
- [ ] OpenRouter account, credit added, **key created with a spend limit**
- [x] Models chosen — the per-role allocation is committed in `src/config.js` (decision 0009); `TRIBUNAL_UNIFORM_MODEL` is for control runs only
- [ ] `.env` created; `git check-ignore -v .env` names `.gitignore`
- [ ] First real deliberation run: `npm run deliberate -- T-001 --provider openrouter`

Soon:

- [ ] Supabase project created; URL and `sb_secret_…` key stored in `.env`

Later:

- [ ] Netlify connected to the repository, three environment variables set, site live
- [ ] DoD items 1 and 3 re-checked at the public address
- [ ] Claude Code installed, runs from inside the project folder
