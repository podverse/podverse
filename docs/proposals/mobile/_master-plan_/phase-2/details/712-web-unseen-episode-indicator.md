# 712-web-unseen-episode-indicator

**Master step:** P2.5.1
**Model (author + implement):** Opus 5
**Status:** done

## Scope

Web counterpart to
[703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md).
Per-channel seen state is account-synced, so **web is a client of it too** — it must both display
and update the state.

### Web writes

Opening a channel page on web sets that channel's `last_seen_at` to now, exactly as opening it on
mobile does.

This is the non-optional half. If web read without writing, a user who listens on the website would
carry a permanently stale unseen badge on their phone. State that syncs across devices must be
written by every device that can change it.

### Web displays

The subscribed list at `/podcasts` shows an unseen-episode count per channel, capped at `20+`,
matching mobile's indicator.

- Applies to the **subscribed** list type only. Global and category browse have no per-user seen
  state.
- Signed-out visitors see no indicator, since there is no account state to read.
- The count renders in both `grid` and `rows` view modes from `ViewSelector`.
- Uses design tokens through the active theme; the count carries meaning, so it must not rely on
  color alone — pair it with a number and an accessible label.

### Shared copy

Strings come from the **`consumer`** i18n catalog so web and mobile use the same wording rather than
duplicating keys. Per the catalog rules, a key may not exist in both `consumer` and `mobile`.

### Not in scope

- Marking seen from the list itself. "Mark All As Seen" stays a mobile affordance for now.
- Any indicator on episode rows. Seen state is per channel, not per item.

## Acceptance criteria

- Visiting a channel page while signed in clears that channel's unseen count, and the change is
  visible on mobile after sync.
- `/podcasts` shows per-channel unseen counts for the subscribed list type, capped at `20+`.
- No indicator renders for global or category browse, or for signed-out visitors.
- Counts render correctly in grid and rows views.
- The indicator is legible without relying on color alone and has an accessible label.
- No new hardcoded strings; keys live in `consumer` and are shared with mobile.
- The list makes one bounded request for counts — not one request per channel.
- E2E covers a subscribed list with unseen counts and the count clearing after a channel visit.

## Web parity references

- `apps/web/src/app/podcasts/PodcastsPageClient.tsx`, `PodcastsPageHeader.tsx`,
  `PodcastsPageContext.tsx`
- `apps/web/src/components/Core/Podcast/CorePodcasts.tsx`
- `apps/web/src/components/ViewSelector/ViewSelector.tsx`
- `apps/web/src/components/NavBar/NotificationBellButton.tsx` — existing `CountBadge` precedent
- `packages/i18n-catalog/consumer/originals/en-US.json`
- Skills: **i18n**, **e2e-page-tests**, **css-custom-properties-no-var-fallbacks**

## Verification

```bash
npm run lint
npm run test:unit
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/podcasts-unseen-badges.spec.ts
```
