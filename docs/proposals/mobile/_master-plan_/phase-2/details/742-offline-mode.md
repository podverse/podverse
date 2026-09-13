# 742-offline-mode

**Master step:** P2.1.10 (Settings & More)
**Model (author + implement):** Auto
**Status:** done

## Scope

Add a device-local **Offline Mode** toggle at the top of More → Features. While it is on, the
app parks all network work and screens default to downloaded/local views, or show a dedicated
unavailable message if they cannot work offline.

### Locked decisions

- **Toggle-only activation.** The user turns Offline Mode on or off. Device reachability does
  **not** enter or leave the mode.
- **Park all network while on.** No new API calls, no background sync, no new downloads, no
  remote playback fallback. Playback uses a completed local file only.
- **Mobile-only.** Web has no offline download library. Intentional divergence
  ([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)).

### Surface

- Pref key `offline.mode` (device-local; not account-synced).
- More → Features: first control is the Offline Mode switch; description appears under the row
  when on.
- Shared helpers in `offlineModeViews` so screens do not invent their own rules.
- Network park: SyncProvider reachability AND, `requestWithMobileAuthRefresh`,
  `downloadManager.enqueue`, `resolvePlaybackUrl`.

### Screen behavior (Offline Mode on)

| Surface | Behavior |
| ------- | -------- |
| More, Settings, About, Sync log | Work (local) |
| Every main-tab screen | Slim warning “Offline mode is on” strip in bottom chrome (sync → Offline Mode → mini player) |
| Home Podcasts / Artists / Albums | Subscribed list (local); skip popularity refresh |
| Home Episodes / Tracks | Downloaded items only |
| Home Clips | Unavailable fill |
| Browse / Search / PI preview | Unavailable fill |
| Podcast detail | **Downloaded** chip on navigate (overrides remembered tab; does not overwrite stored pref); skip channel refresh; network panes show unavailable |
| Episode detail | Stored DTO / download metadata; skip network refresh |
| Library Downloads / Queue / History | Work (local) |
| Playlists / other profiles | Unavailable fill |
| Notifications inbox | Last cached rows only; no refresh |
| Add-by-RSS | List works; Add blocked |
| OPML | Import blocked; export of local follows ok |
| Artist / Album detail | Skip refresh; local tracks when available |

Do not auto-switch bottom tabs.

## Acceptance criteria

- Turning Offline Mode on shows the Features description and parks sync / API / new downloads /
  remote playback.
- A slim Offline Mode warning strip appears in bottom chrome above the tab bar (sync → Offline
  Mode → mini player; does not animate away on stack push).
- Browse and Search show `settings.offline_mode.unavailable` (no spinner / empty list / silent
  failure).
- Podcast detail opens on Downloaded while Offline Mode is on without rewriting the stored tab
  pref.
- Turning Offline Mode off restores network-capable surfaces when the device is reachable.

## Known gap this exposes

Playback bookkeeping is not recorded while Offline Mode is on. A history write that cannot reach the
server is dropped rather than queued, mobile never posts position during playback, and listen stats
are lost — so listening done in Offline Mode does not appear in history afterward. This switch makes
that state reachable deliberately, which turns a latent gap into a user-visible one. Closing it is
[743-offline-playback-reconciliation](/docs/proposals/mobile/_master-plan_/phase-2/details/743-offline-playback-reconciliation.md),
with the multi-device UX in
[744-multi-device-playback-handoff](/docs/proposals/mobile/_master-plan_/phase-2/details/744-multi-device-playback-handoff.md).

## Web parity references

- Mobile-only. No web counterpart.

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- offline-mode
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
