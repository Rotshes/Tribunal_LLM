# Framing — the four deliverables

Module 6. Written in pencil. Revised as the work teaches more; each revision
dated rather than overwritten, so the reasoning stays legible.

> **Open gap:** the case domain — what kind of charge the Tribunal rules on —
> is supplied by the instructor in a later class. Everything below is written
> to survive that decision. Sections that depend on it are marked PENDING.
> This is a stated gap, not an oversight.

---

## 1. Problem statement

*Describes the situation that needs to change, not the solution. Test: could
someone propose several different solutions to it?*

A person facing a contested judgement usually hears one confident answer and has
no way to see what was weighed against it. A single AI answer has the same
shape — it arrives fluent, one-sided, and with its uncertainty invisible. The
reader cannot tell whether the case was close or obvious, or what the strongest
opposing argument was, because nothing shows them the argument that lost.

PENDING: narrow to the instructor's domain once given.

**Several solutions fit this problem**, which is the test passing: show a
confidence score; show sources; show a written dissent; run opposing advocates;
ask the reader to rule themselves. This project takes the fourth. That it is one
choice among several is the point — the problem did not dictate it.

## 2. Stakeholder list

*Everyone with a stake: who uses it, maintains it, approves it, is affected by it.
Test: nobody should discover themselves on this list too late.*

| Stakeholder | Stake | What they assume that may not hold |
|---|---|---|
| The person submitting a case | Wants a judgement they can weigh, not one they must take on faith | That the app's verdict means something. It does not; it is one model's output, several times over. |
| **The person being judged** | Is discussed and ruled against, and never uses the app | That they consented to this. They did not, and may not know it happened. |
| Mikael Gorsky (instructor) | Grades the direction of the agent and the record of it | That the repo history reflects real decisions I made. It must. |
| Me (builder and maintainer) | Answerable for the software whatever wrote it | That I can explain any line if asked. |
| OpenRouter / model providers | Bill per token; enforce usage policies | That my usage stays inside their policy — relevant once the domain is set. |
| Future readers of this repo | Must understand it months later without me | That the why was recorded when the choice was made, not reconstructed after. |

The second row is the one most easily left off, and the one most likely to be
violated. It is written down first for that reason.

## 3. Definition of done

*What must be true for the work to count as finished. Test: could two people
reading the result disagree about whether it was met?*

1. A stranger can open a public web address, submit a charge sheet with all
   three fields, and read a verdict — without being told how.
2. The three judges' rulings appear side by side on one screen, each with its
   own reasoning, and no single combined verdict appears anywhere in the
   output. A reader can see which judges disagreed and on what grounds.
3. Every case submitted is retrievable afterwards by someone who did not submit it.
4. Every model call — including failed ones — has a database row recording
   model, tokens in, tokens out, cost, and latency.
5. A deliberation that exceeds the per-run call cap aborts and says so.
6. When a model returns a malformed or empty response, the screen says the
   deliberation failed. It does not display a verdict.
7. Submitting an incomplete charge sheet produces a message naming the missing
   field, before any model is called.
8. The OpenRouter key does not appear anywhere in the browser bundle or the repo.

Each of these has one true-or-false answer. "The Tribunal gives good judgements"
is deliberately absent: it is a hope, not a definition of done.

## 4. Out-of-scope list

*What the project deliberately will not do. Test: an entry belongs only if
someone could reasonably have expected it in scope.*

| Not doing | Why someone might have expected it |
|---|---|
| User accounts and login | Supabase provides authentication and the app stores per-person data — the obvious next step, deliberately skipped for this term. |
| Editing or deleting a submitted case | Every form-based app usually lets you fix a mistake. Here the record is the point; cases are immutable. |
| Appeals — re-running a case for a different verdict | The courtroom metaphor promises it. Re-running would mostly demonstrate model variability, which Module 9 says is the component's nature, not a fault to appeal against. |
| Varying the model per role | Module 9 names this the biggest cost lever, so its absence is conspicuous. Deferred until the logs justify a choice. |
| Streaming the opinion as it is written | Every chat interface does this. A deliberation is not a chat; the wait is honest. |
| Any claim that a verdict is authoritative | The word "tribunal" invites it. The app must not encourage it. |

"It will not compose music" belongs on no list — nobody expected it to.

---

*Revision log*

| Date | Change | What taught me |
|---|---|---|
| (initial) | First draft | — |
