---
name: grok-bot-guide-sync
description: When changing the Podverse Grok Bot or giving the operator prompts to update it, rewrite the alert-triage guide and alpha walkthrough in the same turn so a from-scratch setup matches the current design. Chat prompts stay deltas for the live bot.
---

# Grok Bot guide sync

Use this when the work changes the Podverse alert-triage Grok Bot, or when the reply tells the
operator how to change that bot (routine text, `/workspace` scripts, secrets, schedule, or
follow-up behavior).

## Docs are the from-scratch setup

In the same turn, update these so a person starting from nothing builds the current design:

- [docs/operations/observability/AGENT-ALERT-TRIAGE.md](/docs/operations/observability/AGENT-ALERT-TRIAGE.md)
- [docs/operations/observability/AGENT-ALERT-TRIAGE-ALPHA-WALKTHROUGH.md](/docs/operations/observability/AGENT-ALERT-TRIAGE-ALPHA-WALKTHROUGH.md)

Rewrite earlier steps in place. A from-scratch reader should not see a superseded prompt, a
"later we changed this" section, or a patch that only existed to correct the first version.

## Chat prompts update the live bot

Prompts in the reply are for the bot that is already running. They can say to pause, edit, or
replace. They will differ from the guide. That is expected. Do not paste those delta prompts
into the guide.
