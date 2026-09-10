# 894-schedule-cross-app-comments

**Master step:** P2.3.13
**Model (author + implement):** Opus 5
**Status:** scheduled — not started

## Scope

Ship **Podcasting 2.0 cross-app comments** on nextgen mobile (and keep web aligned). The old
membership table advertised this row; nextgen does not have it yet. Phase 1 recorded social
features as a v1 deferral
([584-defer-social](/docs/proposals/mobile/_master-plan_/phase-1/details/584-defer-social.md)).
This step is the scheduled revisit so the feature is on the Phase 2 backlog instead of only a
deferral note.

Until this lands, Membership / About omit the row. The comparison table can still render a
Coming soon cell when a row sets `comingSoon`.

## Why it waited

Cross-app comments need a server-side product direction and a moderation surface. Those are not
in the mobile MVP. OS share of public URLs covers send-to-a-friend.

## When this is picked up

- Social / comment API and moderation exist (or are detailed) for web and mobile together.
- Episode and podcast surfaces have a comments entry that reads the Podcasting 2.0 comment
  feed, not a Podverse-only social graph.
- Membership comparison adds a `comments` row with Free + Premium checks.

## Out of scope

- Activity feeds, reactions, and follow-of-users (still under 584 until separately scheduled).
- Value-for-value streaming sats (not a nextgen feature).
- Sleep timer (already stubbed on the full player; player-area polish is P2.1.4).
