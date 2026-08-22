# 08 — Web membership-gating parity (broaden the modal to the full action set)

**Cursor model:** Opus 4.8 (cross-cutting web wiring + E2E)
**Master step:** Track 19.4 (563) — web side of parity (web app, not management-web).
**Ship bar:** On **web**, attempting **any** member-only action while logged-in but expired/insufficient
shows the **membership modal** (Cancel + auth-based Renew) — matching mobile — instead of a generic
error, using the shared parser from 01.

## Why (current parity gap)

Web wires the membership 403 → modal at only **2** call sites (`getMembership403ModalProps` in
`PodcastIndexFeedInfo.tsx` and `ListChannelSettings.tsx`). All other member-only actions
(subscribe/follow, playlist create/edit, queue mutations, notifications settings, add-by-RSS add) use
the **login-required** modal (logged-out) or a **generic error** (logged-in expired). So a logged-in
**expired** web user gets a raw error on most actions. Mobile (03) gates the full set — web must match.

## Scope

1. **Centralize** the membership-403 → modal handling on web. Add a small helper/hook
   (e.g. `apps/web/src/utils/membership/handleMembershipGateError.ts` or a
   `useMembershipGate()` hook) that:
   - Uses the **shared** `parseMembershipGateError` from `@podverse/helpers-requests` (01).
   - Builds the web modal via `getMembership403ModalProps` and opens it through the existing
     `Modals` context (`ModalLoginRequired`/`ModalMessage`).
   - Returns `true` when it handled a membership 403 so callers can stop their generic error path.
   - Supports a **generic** `featureContext` default (add contexts only where bespoke copy exists,
     e.g. `directory_add_by_rss`, `manual_refresh`).
2. **Wire the parity action set** (mirror the API's valid-membership routes + mobile 03) to route their
   403s through the helper before any generic toast/error:
   - Subscribe/follow (`SubscribeButton.tsx`), notifications (`NotificationIconButton.tsx`,
     `SettingsNotifications.tsx`), playlist create/edit + add-to (`ModalPlaylistAddTo.tsx`, playlist
     forms), queue mutations (`ListQueueResources.tsx`), add-by-RSS add
     (`AddByRSSAddFeedPageClient.tsx`), clip create (`ClipForm.tsx`).
   - Keep the existing **login-required** modal for logged-out users (401/auth) — the membership modal
     is for logged-in denials only. Do **not** double-show.
3. **Label parity:** the modal's action stays **auth-based** — logged-in → "Renew" (`renew_membership`
   → `renewPath`); the logged-out path continues to use the login modal. No "Upgrade" variant.
4. **i18n:** reuse existing `membership.*` catalog keys; add a generic blocked-action body key only if
   no suitable one exists. No new literals in components.

## Tests (write, do not run)

- **E2E (Playwright, web):** add/extend a spec proving a logged-in **expired** user attempting a
  member-only action (e.g. subscribe or create playlist) sees the membership modal with the Renew
  action → `renewPath`. Use the existing expired-membership E2E seed/fixture if present; otherwise add
  one. Follow **e2e-page-tests** + **ui-e2e-screenshot-report**.
- Keep the 2 existing membership-modal specs green.

## Guards

- Web app only (**not** management-web).
- Reuse `getMembership403ModalProps` + `Modals` context; don't fork a second modal system.
- Strict equality; no `as`; `import type`; extensionless Tier B imports in `apps/web/src`.

## Acceptance

- Logged-in expired web user gets the membership modal on the full member-only action set (parity with
  mobile 03), with Renew → `renewPath`.
- Logged-out users still get the login modal (unchanged).
- Shared parser (01) is the single source of 403 detection for web + mobile.

## Verification (operator)

```bash
npm run build:packages
make e2e_test_web_report_spec SPEC=e2e/membership-gating.spec.ts
open .artifacts/e2e-reports/latest/index.html
```
