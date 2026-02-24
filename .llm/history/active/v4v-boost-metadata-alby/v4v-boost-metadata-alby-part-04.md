# Feature: v4v-boost-metadata-alby (Part 4)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 41, create `v4v-boost-metadata-alby-part-05.md`.

## Metadata

- Started: 2026-02-24
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/47
- Branch: feature/v4v-boost-metadata-alby
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[Continuation of V4V local LN reliability fixes and follow-up debugging.]

## Sessions

### Session 31 - 2026-02-24

#### Prompt (Developer)

assess the terminal logs, then make the changes needed to fix @/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/21.txt:863-1029

#### Key Decisions

- Root cause confirmed from logs: recipient-node `lncli` commands were still defaulting to `/root/.lnd` while recipient containers now run with `--lnddir=/data/.lnd`.
- Fixed recipient-node scripts by passing `--lnddir=/data/.lnd` for all `docker exec "$container" lncli ...` calls used in readiness checks and recipient pubkey discovery.
- Limited scope to recipient-node script paths only; main Nigiri `lnd` commands remain unchanged.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/scripts/v4v/btc/ln/provision-ln-recipient-nodes.sh
- /Users/mitcheldowney/repos/pv/podverse/scripts/v4v/btc/ln/discover-recipients.sh

### Session 32 - 2026-02-24

#### Prompt (Developer)

Fix `local_nuke_rebuild_run_v4v` LN Provisioning Failure

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added resilient recipient channel provisioning with bounded reconnect + openchannel retries to handle transient peer disconnects during `local_ln_up`.
- Added peer-state diagnostics on channel-open failure (`listpeers` snapshot + attempt output) to improve debuggability when provisioning fails.
- Found a deeper root cause from runtime logs (`Block height out of range`) due stale external recipient volumes surviving cleans; updated `local_ln_clean` to explicitly remove recipient volumes.
- Tightened recipient readiness checks to require `synced_to_chain=true` instead of only RPC availability before funding/channel steps.
- Verified success with `nix develop .#v4v --command make local_ln_up` and confirmed the full `local_nuke_rebuild_run_v4v` path advances past `local_ln_up` recipient provisioning.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/scripts/v4v/btc/ln/provision-ln-recipient-nodes.sh
- /Users/mitcheldowney/repos/pv/podverse/Makefile.local.v4v

### Session 33 - 2026-02-24

#### Prompt (Developer)

The boost form should not have app recipient displayed When the boost form is attached to a media item. Instead, sending a boost to the app should be its own form on a new page. And the page is called donate. And the form looks exactly like the form that appears for media boosts but it only has one donation option and it is the app value recipient That we currently have Integrated with the keys and boost form implementation wise, it should expect data similar to how it is parsed out of RSS feeds and as of today that form should support both Ln address and the key send approach. We may need more environment variables. So we can specify either key send or ln address for the app The donate page should have a brief explanation at the top of it That lets the user know that this donation will be sent to Podverse. And if they are looking to donate to a Podcaster or artist, then they should use the boost button on their respective page and also show the font awesome icon they will need to press on the page so it can educate them as to what to look for To send boosts to a podcaster or artist since the boost form will be nearly identical between media pages and the app donate page, It may make sense to have two separate components with reusable logic. shared between them possibly in another component for consistency but also separation

#### Key Decisions

- Extracted shared Boost form behavior into `BoostFormBase`, allowing media boosts to omit the app recipient and a new donate form to target only the app recipient.
- Added LNAddress app recipient env/config wiring and updated app value lookup to choose between keysend and LNAddress by method.
- Implemented a dedicated Donate page using translations and the boost icon with app-only donation messaging.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostDonateForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostFormBase.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostFormFields.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostRecipientInfo.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostPayments.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostRecipients.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/config/index.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/config/runtime-config.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/donate/page.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/donate/Donate.module.scss
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/value/appValue.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/en-US.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/ENV.md
- /Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/web/configmap.yaml
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/lighthouse/.env.web
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/lighthouse/.env.web.example

### Session 34 - 2026-02-24

#### Prompt (Developer)

can useBoostRecipients be split into useBoostRecipients and useBoostAppRecipients for clarity and separation? while still using reusable logic where appropriate (if any?).

places where "creator" and "app" are both passed seem like a code smell to me, as it seems like twisting logic that should not overlap, but i am not sure. please advise

#### Key Decisions

- Split recipient handling into creator-focused `useBoostRecipients` and app-only `useBoostAppRecipients`, with shared status handling in `useBoostRecipientStatuses`.
- Moved LNAddress message notice logic and combined recipient list to `BoostFormBase` to keep app/creator flows separate.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostFormBase.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostRecipients.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostAppRecipients.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostRecipientStatuses.ts

### Session 35 - 2026-02-24

#### Prompt (Developer)

remove the "boost test mode" url param and handling which is no longer needed

#### Key Decisions

- Removed the boost test flow and URL param handling from boost forms, simplifying submission to always use real payments.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostFormBase.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostTestFlow.ts

### Session 36 - 2026-02-24

#### Prompt (Developer)

BoostDonateForm should be renamed to BoostAppDonateForm since it is specifically only for the app

#### Key Decisions

- Renamed the app-only donate form component to `BoostAppDonateForm` for clarity.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/donate/page.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostAppDonateForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostDonateForm.tsx
