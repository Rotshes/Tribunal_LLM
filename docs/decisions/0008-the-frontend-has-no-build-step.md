# 0008 — The frontend has no build step

Status: accepted
Date: 31 August 2026

## The decision

`web/index.html` is one file: plain HTML, CSS and JavaScript, served as-is. No
React, no Vite, no bundler, no `node_modules` in the published directory.

The backend is unchanged — the Netlify functions import `src/` directly, and
`deliberate()` does not know it is being called over HTTP.

**Revisit when the app grows past one screen.** Not before, and not on taste.

## Why, and what it was chosen over

Lesson 1 slide 7 names React and Vite in the toolbox, so this is a deviation and
should be read as one.

**React + Vite, per the toolbox.** Rejected for this term. It would be two
dependencies plus a build pipeline for an app with one form and one results
view, and adding dependencies is on the stop-and-ask list precisely so this
question gets asked rather than assumed. There is also a schedule argument: a
build step is a thing that can break, and it would be breaking close to a
deadline in exchange for structure this page does not need.

**Plain, permanently.** Not chosen either. If the app gains a second case, a
history view, or any shared state, hand-written DOM updates stop being simpler
than a framework and start being worse. The decision is *plain now*, with a
stated condition for changing.

## What it costs

- A visible deviation from the course toolbox, which is why this record exists.
- No component model. Two render functions build HTML strings; every value
  passing through them goes via `esc()`, which is a discipline a framework would
  have enforced instead of leaving to review.
- No hot reload. `netlify dev` and a browser refresh.

## What it buys

- Zero frontend dependencies, so nothing in the published directory needs
  auditing or updating.
- The page is readable end to end in one file by someone who has never seen the
  project. For a repository whose whole purpose is being read as a record, that
  is worth more here than it usually would be.
- Nothing between the source and what the browser runs.

## What would change this

A second screen, a second case in the interface, or any state shared between
views. At that point React earns its dependency and this record gets superseded
rather than quietly ignored.
