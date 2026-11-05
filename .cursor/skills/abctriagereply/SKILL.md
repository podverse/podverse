---
name: abctriagereply
description: Turn a triage-bot handoff into the message the operator pastes back, including which findings are resolved and must leave the private file and handoffs. Use when the operator says abctriagereply or /abctriagereply.
---

# `abctriagereply`

The operator carries prompts between the triage bot and this Cursor chat. A prompt that starts
as a triage-bot handoff is investigated here. **abctriagereply** is the message they paste back
into the triage bot's chat.

The operator may say Grok Bot. That is the Cursor product this triage bot runs on. The reply
and the standing docs say **triage bot** unless the sentence is about that product's setup,
secrets, billing, or app UI. Product setup stays in the alpha walkthrough.

## When a handoff arrives

Investigate read-only first. Do not change the cluster unless the operator asks for a change
in that message. GitOps for Podverse alpha is `k.podcastdj.com`; a path in the handoff is a
hint, not proof of which Application applies the workload.

## What the reply does

Lead with one fenced `text` block the operator pastes into the triage bot chat (Podverse alpha:
the `Podverse alpha triage` bot). The block is a delta for the bot that is already running. It
is not copied into the guide.

The block tells the bot:

- Which findings are resolved, with the fingerprint, issue number, or handoff title when known.
- To delete those entries from `private-findings.md` and `handoffs.md` in the same turn.
- To record them under `resolved` in `state.json` with the time, and not recreate them unless a
  new firing starts after that time.
- Not to open an issue, and not to comment on an issue that is already closed.

`private-findings.md` and `handoffs.md` hold only unresolved items. A resolved alert does not
stay there to be summarized again.

Do not ask the bot to comment. The operator closes an open GitHub issue themselves when they
want the tracker updated. Say that next to the paste, including the issue number.

If the check could not confirm a finding, leave it off the resolved list and say what is
missing. Do not tell the bot to clear it.

## Standing rule on the scheduled routine

A chat message does not by itself change the saved routine. When the live routine does not yet
delete resolved private findings and handoffs, the same reply tells the bot to add that
behavior to the saved routine instruction. The from-scratch text lives in
[AGENT-ALERT-TRIAGE.md](/docs/operations/observability/AGENT-ALERT-TRIAGE.md) and the alpha
walkthrough. Update those in the same turn when this behavior changes
(**grok-bot-guide-sync**). Do not paste the chat delta into the guide.
