# Summary — automatic offline detection (779)

Detail doc:
[779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)
· Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Prompts: [COPY-PASTA.md](COPY-PASTA.md)

## Goal

`offline.mode` currently means two things: "the user asked for offline" and "the network is
unusable". Only the first exists, so no signal — or a healthy device talking to a down server —
produces endless spinners, failed downloads, and a sync queue grinding through every job. Split the
two, and derive the second from reachability plus observed request outcomes.

## Locked decisions

Do not revisit these while implementing. Full reasoning is in the detail doc.

- **Three concepts, not one boolean.** The `offline.mode` pref (user-forced), a derived connectivity
  state (`online` / `device_offline` / `server_unreachable`), and effective offline
  (`userForced || connectivity !== 'online'`).
- **Auto-offline is softer than the toggle.** It backs off background sync, pauses in-flight
  downloads, and makes failures read as offline — but still permits user-initiated requests, health
  probes, and **remote streaming**.
- **Auto-offline never steers navigation.** No forcing the Downloaded chip, no rewriting remembered
  tabs. Only the manual toggle steers.
- **Exit requires a successful request.** NetInfo says "connected" on captive portals and dying
  signal, so it is a hint that triggers a probe, never the authority.
- **Cause-specific, brand-neutral copy.** "No internet connection" vs "Can't reach the server". No
  `{brand_name}` — mobile has no brand config and this must not create the need for one.
- **Never a toast, dialog, or push.** The bottom-chrome strip is the only announcement.
- **The More switch keeps showing only the pref.** Never the auto state.
- **No account sync.** Connectivity is device-local and ephemeral, not even a pref.
- **No new dependency.** `@react-native-community/netinfo` (`11.4.1`, MIT) is already installed and
  already subscribed in `SyncProvider.tsx`; this work relocates that subscription. No native rebuild.

## File inventory

### New — `apps/mobile/src/net/`

| File                       | Owns                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `connectivityMachine.ts`   | Pure state machine: debounce, success-only exit, backoff, dwell time   |
| `connectivityMachine.test.ts` | The load-bearing unit tests                                        |
| `connectivity.ts`          | Live store, NetInfo subscription, `reportNetworkOutcome`, React hook   |
| `connectivityProbe.ts`     | Unauthenticated `GET /api/v2/health` with a short timeout              |

`connectivityMachine.ts` stays free of React Native and Expo imports so the semantics that are easy
to get wrong are unit-testable in node — the same split
[`syncQueue.ts`](/apps/mobile/src/sync/syncQueue.ts) already uses.

### Changed

| File                                                     | Change                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `apps/mobile/src/prefs/offlineMode.ts`                   | Add `useOfflineStatus()`; keep `isOfflineModeEnabled()` pref-only       |
| `apps/mobile/src/prefs/index.ts`                         | Re-export the new surface                                              |
| `apps/mobile/src/sync/SyncProvider.tsx`                  | Drop the local NetInfo subscription; drive park from derived state      |
| `apps/mobile/src/sync/syncErrorClassification.ts`        | Split 502 / 503 / 504 out of the reached-the-server bucket              |
| `apps/mobile/src/auth/authRequestWithRefresh.ts`         | Report every outcome to `reportNetworkOutcome`                          |
| `apps/mobile/src/components/screen/OfflineModeBanner.tsx`| Render forced / `device_offline` / `server_unreachable`                  |
| `apps/mobile/src/downloads/downloadManager.ts`           | Pause on auto-offline, auto-resume on restore, `enqueue` stays pref-only |
| `apps/mobile/src/data/repositories/playbackOutboxRepository.ts` | Gate `drain` on effective offline                               |
| `apps/mobile/src/lib/offlineModeViews.ts`                | Document forced-only helpers                                            |
| `packages/i18n-catalog/mobile/originals/en-US.json`      | Two new banner keys (en-US only — CI translates the rest)               |

### abcmemory and docs

| File                                              | Change                                               |
| ------------------------------------------------- | ---------------------------------------------------- |
| `.cursor/rules/mobile-offline-mode.mdc`           | Rewrite the toggle-only section around three concepts |
| `.cursor/rules/mobile-sync-orchestration.mdc`     | Fix the § Related line that repeats toggle-only       |
| `docs/.../details/742-offline-mode.md`            | Note it is superseded on activation only              |
| `docs/.../details/779-automatic-offline-detection.md` | Flip status to done                               |
| `docs/.../phase-2/001-MASTER-PLAN-PHASE-2.md`     | Index 779 under P2.1.10 and in the Appendix           |

## i18n

Add to `packages/i18n-catalog/mobile/originals/en-US.json` under the existing
`settings.offline_mode` block, sentence case, brand-neutral:

- `banner_no_connection` — "No internet connection"
- `banner_server_unreachable` — "Can't reach the server"

**Only edit `en-US.json`.** `.github/workflows/i18n.yml` translates `es`, `fr`, and `el-GR` on
`develop` when any layer's `en-US.json` changes. Do not hand-write the other locales.

## The risk in this set

Step 01 is timers plus state: an entry debounce, a minimum dwell time, exponential backoff, and a
probe whose result races against new NetInfo events. Every one of those is a place where a naive
implementation flaps the banner or wedges in the offline state forever. That is why the machine is
pure and separately tested, and why 01 gets Opus 5.

The second risk is subtler: **auto-offline must not become a stricter gate than intended.** If the
implementation starts refusing requests because it believes we are offline, the app loses its only
means of discovering it is back. Every gate added in this set is either pref-only or explicitly
probe-permitting.

## Cross-surface note

Mobile-only. No API, ORM, DTO, or OpenAPI work — `GET /api/v2/health` already exists and is already
unauthenticated. No persisted DTO field changes, so no device-data migration. No new SQLite
migration. Web has no counterpart and intentionally stays without one.

## Not in this set

- Mobile brand-name config and `{brand_name}` interpolation (chosen brand-neutral copy avoids it).
  The two existing hardcoded "Podverse" strings in `consumer/originals/en-US.json` stay as they are.
- Wifi-only / metered-connection download policy. Related, and NetInfo already reports connection
  type, but no such pref exists today and adding one is its own feature.
- Any account-synced or cross-device representation of connectivity.
