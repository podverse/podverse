# 728-defer-channel-auto-download

**Master step:** P2.3 (operational backlog — new)
**Model (author + implement):** Auto
**Status:** deferred to a future phase

## Scope

Per-channel **auto-download** (download new episodes automatically when subscribed) appeared in the
legacy podcast settings and was requested as a **placeholder** on the nextgen podcast settings
screen ([726](726-podcast-settings-and-header-bell.md)). Implementation is **deferred**.

### What ships now

- A visible, disabled (or “coming later”) row on the podcast settings screen so the product
  affordance is not forgotten.
- This detail doc as the durable home for the feature.

### When picked up

Decide and record:

- Whether auto-download is anonymous (local only) or membership-tier.
- Default on/off when enabling notifications or when subscribing.
- Interaction with download quota, Wi‑Fi-only prefs, and livestream / HLS eligibility
  (`downloadEligibility`).
- Storage: device-local per channel vs account-synced.
- Whether web gets a counterpart or mobile-only is intentional.

Do not invent scheduling until those decisions are locked.

## Acceptance criteria (when implemented)

- Per-channel auto-download can be toggled from podcast settings.
- New eligible episodes enqueue through `downloadManager` without opening each episode.
- Ineligible items (live / HLS) are skipped without error spam.
- Preferences survive app restart; sync behavior matches the locked decision.
- E2E covers enable → new episode appears in Downloads.

## Web parity references

- Mobile: [`downloadManager`](apps/mobile/src/downloads/downloadManager.ts),
  [`DownloadControl`](apps/mobile/src/components/download/DownloadControl.tsx)
- Legacy inspiration: podcast-rn podcast settings auto-download (not a port target)
- Placeholder consumer: [726-podcast-settings-and-header-bell](726-podcast-settings-and-header-bell.md)

## Verification

```bash
# Mobile Maestro (when implemented)
npm run mobile:e2e:test -- podcast-episode
npm run mobile:e2e:test -- library-downloads
```
