# `.llm/plans/active/`

In-progress multi-step plan sets (one directory per feature or initiative). **Not** `.llm/templates/` —
templates are blanks; this directory holds real plan instances.

- Keep each plan file under 300 lines; split into numbered files when larger.
- Use `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, and numbered plans per repo convention.
- When finished, move the set to `plans/completed/` (see **plan-completion** skill).
- See [LLM.md](/.llm/LLM.md).

## Indexed sets

_Active (mobile):_ none. Track 23 visual/UX polish is now **operator-manual** (the checklist/apply
phase `mobile-pg13-operator-polish/` was declined and archived; agent-assist is optional). Remaining
`_TBD_` mobile steps are Track 18.6–18.17 (Watch/TV/store), Track 19 (IAP/V4V monetization), Track 20
(FOSS/F-Droid), Track 21 (deferral docs), Track 22 (release process) — most are operator/store-gated
or post-v1. See master plan [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md).
**Publish hold:** no alpha/internal test-track publish until the operator finishes manual polish.

_Active (non-mobile):_ `media-player-livestream-hls-migration/` (blocked on the media-player
architecture refactor; `video.js` + the `Controller/LiveStream/` tree are still present),
`web-404-hardening-deferred/` (deferred; no `isApiRequestNotFoundError` helper or SEO-fetcher
404→`notFound()` wrapper exists yet), `web-e2e-coverage-high-level/` (planning-only baseline).

_Recently completed (non-mobile):_
[doc-link-path-missed-followup](../completed/doc-link-path-missed-followup/) (**obsolete** — the
optional-extension-metrics README already uses the canonical repo-root link; no `../../` link
remained),
[route-navigation-loading-warning](../completed/route-navigation-loading-warning/) (**obsolete /
superseded** — `useRouteNavigationLoading` was rewritten to `useSyncExternalStore` with no React
setter, so the `useInsertionEffect` warning root cause is gone),
[opml-test-hardening](../completed/opml-test-hardening/) (deferred OPML confidence work: HTTP 429
burn-in tests, broker-backed worker integration + `requestId` dedupe regression, E2E hourly-counter
determinism),
[rate-limit-env-tunable](../completed/rate-limit-env-tunable/) (API HTTP + OPML soft-cap env
knobs with `_PER_MINUTE` / `_PER_10_MINUTES` / `_PER_HOUR` / `_PER_DAY`, plus local
`rate-limit.env` override wiring).

_Recently completed (mobile):_
[mobile-list-virtualization](../completed/mobile-list-virtualization/) (Subscriptions, PlaylistDetail,
PodcastDetail converted to `FlatList`; virtualization baseline audit + `mobile-list-virtualization`
abcmemory rule),
[mobile-pg10-tablet](../completed/mobile-pg10-tablet/) +
[mobile-pg10-tablet-followups](../completed/mobile-pg10-tablet-followups/) (responsive tablet
home grid, split detail + player layout, tablet E2E incl. FullPlayer two-column, mid-band breakpoint
decision docs, phone-Home `FlatList` intent lock),
[mobile-e2e-green](../completed/mobile-e2e-green/) (all mobile Maestro flows green: iOS open-dialog
handling, custom-scheme deep-link path fix, tablet tab-bar + orientation stabilization),
[mobile-track14-16-unit-tests](../completed/mobile-track14-16-unit-tests/) (node-only vitest coverage
for Track 14–16 pure logic: deep-link path map, notification tap-routing target, share-URL parity,
unified prefs store),
[mobile-track14-push](../completed/mobile-track14-push/) (14.1–14.8 — FCM playstore transport +
device register/locale/permission UX, UnifiedPush FOSS transport + wrappers, notification tap
routing via the 452/453 deep-link path, FOSS register doc + push-routing E2E; **Track 14 complete**),
[mobile-track15-deep-links](../completed/mobile-track15-deep-links/) (15.1–15.6 — native
universal/App Links config, path map + cold-start replay, share URL parity, deep-link E2E),
[mobile-track16-prefs-settings](../completed/mobile-track16-prefs-settings/) (16.1–16.3 — unified
device prefs store, prefs server sync, settings screen; **Track 16 now complete**),
[mobile-pg8-car-library-follows](../completed/mobile-pg8-car-library-follows/) (12.22, 12.21 — car
Library browse projects the merged subscriptions list + followed playlists; parallel-worktree
operator doc; **Track 12 complete**),
[mobile-unified-subscriptions](../completed/mobile-unified-subscriptions/) (9b.8, 8.16, 9.30 — merged
directory follows + add-by-RSS into one filterable subscribed list; Home + My Library),
[mobile-pg8-car-android-auto](../completed/mobile-pg8-car-android-auto/) (12.11–12.17, 12.19, 12.20 —
Android Auto native browse + play from cache; iOS CarPlay 12.7–12.10 / 12.18 is a later slice pending
the Apple CarPlay entitlement),
[mobile-pg8-car-native-cache](../completed/mobile-pg8-car-native-cache/) (12.1–12.6),
[mobile-track13-downloads](../completed/mobile-track13-downloads/) (13.1–13.10),
[mobile-track9d-playlist-authoring](../completed/mobile-track9d-playlist-authoring/)
(9d.1–9d.5),
[mobile-track11-video](../completed/mobile-track11-video/),
[mobile-pg5-video](../completed/mobile-pg5-video/) +
[mobile-pg5-video-gaps](../completed/mobile-pg5-video-gaps/).

Operator visual polish remains **Track 23** only (after feature bulk + operator briefs).
