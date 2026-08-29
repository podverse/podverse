# 10 — Web unseen episode indicator

**Cursor model:** Opus 5
**Reasoning:** high
**Detail:** [712-web-unseen-episode-indicator](/docs/proposals/mobile/_master-plan_/phase-2/details/712-web-unseen-episode-indicator.md)
**Master step:** P2.5.1
**Depends on:** 04

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 39–40 and 42 before starting. This is a **web** prompt
inside a mobile-focused set — verify with Playwright, not Maestro.

## Goal

Web becomes a full client of the per-channel seen state created in prompt 04: it **writes** the
timestamp and **displays** unseen counts.

## Why the write half is not optional

Seen state syncs across the account. If web read without writing, a user who listens on the website
would carry a permanently stale unseen badge on their phone forever. Any state that syncs across
devices must be written by every device that can change it.

## Work

1. **Write:** opening a channel page while signed in sets that channel's `last_seen_at` to now, the
   same way opening it on mobile does.
2. **Display:** show a per-channel unseen count on `/podcasts`, capped at `20+`.
   - **Subscribed list type only.** Global and category browse have no per-user seen state.
   - Nothing renders for signed-out visitors.
   - Works in both `grid` and `rows` modes from `ViewSelector`.
3. Fetch counts in **one bounded request** for the list — never one request per channel. The endpoint
   from prompt 04 is already capped and bounded; use it as designed.
4. Reuse the existing `CountBadge` precedent from `NotificationBellButton` rather than inventing a
   second badge.
5. **i18n:** strings come from the **`consumer`** catalog and are shared with mobile. A key may not
   exist in both `consumer` and `mobile`; if prompt 04 or 07 put one in the mobile overlay, move it.
6. **Screen reader** per [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc):
   the count carries meaning, so do not rely on color or position alone. Give the badge an accessible
   label that names the channel and the count, mark the decorative icon `aria-hidden`, and make sure
   the count is part of the link's accessible name rather than an orphaned number. The existing
   `CountBadge` `ariaLabel` prop is the pattern to follow.
7. Extend the `/podcasts` E2E spec to cover a subscribed list with unseen counts and the count
   clearing after a channel visit.

## Constraints

- Design tokens through the active theme; no hardcoded hex, no `var(--token, fallback)`.
- Strict equality, no type assertions, `import type` on separate lines.
- Prefer `@podverse/ui` primitives over app-local markup.
- Do not add a "mark all as seen" control to web; that stays a mobile affordance for now.
- Do not run tests during implementation.

## Done when

Visiting a channel on web clears its unseen count and that clears on mobile after sync; `/podcasts`
shows capped counts for the subscribed list in both view modes; signed-out visitors see nothing; one
bounded request serves the list.
