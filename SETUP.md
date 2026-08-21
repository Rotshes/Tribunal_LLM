# Setup — the five accounts

Lesson 1, slide 7. Gorsky calls these recommendations, not requirements, but
they are what the course teaches against, so use them unless you have a reason.

Do these in order. Stop after step 2 if you are short on time — those two are
the ones that block everything else.

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

1. Create an account, add a small amount of credit (a few dollars goes a long way).
2. Create an API key.
3. **Put it in an environment variable, never in the repo.** If it ever lands
   in a commit, it is public forever — rotate it rather than deleting the commit.

This is the only one that costs money per use, which is why Module 9 spends a
whole module on the economics of a single call.

## 4. Supabase — the database

**What it is:** your app's memory (Module 7). A Postgres database with a web
interface, plus authentication and file storage you are not using yet.

Create a project and keep two things: the project URL and the keys. Note that
Supabase gives you a public key and a secret one — the secret one is backend-only,
same rule as the OpenRouter key.

Free tier pauses inactive projects. Do not discover this the night before a demo.

## 5. Netlify — deployment

**What it is:** what puts your app at a real web address so someone else can
open it. Module 7: an app on your own machine is not yet reachable by anyone.

Connect it to your GitHub repository. After that, pushing to `main` deploys
automatically. Set your secrets in Netlify's environment variables, not in the code.

Remember what Module 7 says about why this layer earns respect: on your laptop
a mistake harms one person who can undo it; deployed, the same mistake reaches
everyone at once and keeps being served until someone notices.

---

## Checklist

- [ ] GitHub account, git installed, commit identity set
- [ ] `tribunal` repository created, instructor added
- [ ] Claude Code installed, runs from inside the project folder
- [ ] OpenRouter account, credit added, key in an environment variable
- [ ] Supabase project created, URL and keys stored safely
- [ ] Netlify connected to the repository
- [ ] `.gitignore` contains `.env` — verify before your first commit
