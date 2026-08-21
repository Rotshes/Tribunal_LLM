# 0001 — Log every model call, including the failures

Status: accepted
Date: (fill in)

## The decision

Every call to a model writes one database row before the response is shown:
model name, role (which advocate or judge), tokens in, tokens out, cost,
latency, and whether it succeeded. Calls that failed, timed out, or returned
malformed output are logged too.

## Why, and what it was chosen over

The obvious alternative is to log only what the user sees — the final verdict
and its reasoning — and treat the mechanics as plumbing.

Rejected for three reasons:

1. **The cost decision depends on it.** Module 9 names model choice the biggest
   lever on cost, and this project deliberately starts with one model
   everywhere. That is only defensible as a starting point if it produces the
   measurements that let a later choice rest on data rather than on a guess.
   Without the log, "cheap advocates, capable judges" stays an intuition.

2. **Failures are the interesting rows.** A model that returns prose where a
   verdict was demanded is Module 9's fluent failure. If failures are not
   logged, the only evidence they happened is that a user saw an error, and
   the rate is unknowable.

3. **Module 4 calls the audit trail the thing that separates engineering from
   craft** — and notes it is the part most easily lost, precisely because it is
   the part nobody misses until later.

## What it costs

A write on the hot path for every one of the seven calls per deliberation, and
a table that grows faster than the case table by roughly seven to one. Both
are accepted. If the write latency becomes visible to users, log asynchronously
rather than dropping the log.

## What would change this

If the per-call fields turn out never to be read after a term of use, the row
can narrow. The existence of the log should not be reopened on those grounds —
the argument for it is not that the fields get read often, but that they cannot
be recovered later if they were never written.
