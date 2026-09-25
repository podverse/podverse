# 728-channel-auto-download

Runtime picture (triggers, server mirror, iOS vs Android):
[MOBILE-AUTO-DOWNLOAD](/docs/development/mobile/MOBILE-AUTO-DOWNLOAD.md).

**Master step:** P2.3 (operational backlog)
**Model (author + implement):** Auto
**Status:** implementing (mobile-auto-download plan set)

## Scope

Per-channel **auto download** — download new episodes automatically when a podcast is opted in —
plus global defaults that new subscriptions inherit, and OS / silent-push triggers so transfers can
start without the user opening the app.

### Locked decisions

| Question       | Decision                                                                                                                                                                                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier           | **Membership** (signed in, valid membership). Lapsed members keep settings and completed files; auto download pauses; toggling opens the renewal gate.                                                                                                   |
| Storage        | **Device-local** source of truth (SQLite + AsyncStorage). Server holds only a per-installation mirror of channel ids for silent push.                                                                                                                    |
| Global default | Auto download for **new** subscriptions = **off**. Cellular allowed = **off** (Wi‑Fi only).                                                                                                                                                              |
| Inheritance    | Subscribe snapshots global → channel row; per-channel override. Changing global later affects only new subscriptions unless the user picks **Apply to all** ([`global-default-apply-to-existing`](/.cursor/rules/global-default-apply-to-existing.mdc)). |
| Web            | Auto download is **mobile-only** (web has no offline library). Notification-default apply popups ship on **web and mobile**.                                                                                                                             |
| Fallback       | If the background spike cannot prove iOS silent-push downloads, drop to best-effort anonymous (foreground + background fetch only) and skip server push registration.                                                                                    |

### Reliability

- Idempotent `auto_download_candidate` ledger (`pending` / `enqueued` / `skipped_ineligible` /
  `user_removed`). Deleted downloads are not re-fetched.
- Per-channel `enabled_at` watermark — no backfill of the catalog when enabling.
- Gates every run: membership, Offline Mode toggle, NetInfo vs cellular pref, `isItemDownloadable`,
  quota / auto-free.
- Network-blocked items stay `pending` and retry on Wi‑Fi / foreground / background fetch.
- Launch reconciles interrupted `downloading` rows against disk.
- Sync kinds `auto-download-evaluate` and `auto-download-registration` are visible in the sync bar
  and event log.

### Honest platform limits

- iOS drops silent pushes after a force-quit, throttles them, and delays them in Low Power Mode.
- Background fetch timing is OS-controlled.
- Add-by-RSS feeds are not server-parsed on a schedule; they auto download only on foreground or
  background fetch.

### Surfaces

| Control                                  | Where                                       |
| ---------------------------------------- | ------------------------------------------- |
| Global auto download + cellular defaults | More → Settings → Downloads                 |
| Per-podcast auto download + cellular     | Podcast settings                            |
| Silent-push channel registration         | `PUT /account/auto-download/channels`       |
| New-item data-only push                  | Parser next to `handleNewItemNotifications` |

## Acceptance criteria

- Global defaults default off; new follows inherit the snapshot; per-channel overrides work.
- Toggling a global default with existing matching entities shows apply-to-all vs only-new.
- New eligible episodes enqueue through `downloadManager` without opening each episode.
- Ineligible items (live / HLS) are skipped without error spam.
- Preferences survive restart; registration clears on sign-out / membership loss.
- E2E covers settings toggles and downloads appearance where Maestro can assert.

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- podcast-episode,settings-downloads,library-downloads,notifications-inbox

# API / web (notification apply popups + auto-download registration)
npm run openapi:check
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/settings-notifications.spec.ts
```
