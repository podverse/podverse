# 779-automatic-offline-detection

**Master step:** P2.1.10 (Settings & More)
**Model (author + implement):** Opus 5 (connectivity machine) / Codex 5.3 (remaining steps)
**Status:** done

## Scope

Add a derived **connectivity state** so the app behaves sensibly when the device has no signal and
when the server itself is down, without letting a flaky connection flap the UI. The user's manual
Offline Mode toggle keeps its current meaning; the new state sits beside it.

## Supersedes a locked decision in 742

[742-offline-mode](/docs/proposals/mobile/_master-plan_/phase-2/details/742-offline-mode.md) locked
"Toggle-only activation. Device reachability does **not** enter or leave the mode." That still
describes the **pref** — reachability never writes `offline.mode`. It no longer describes the app,
because reachability now produces a separate state that steers fallback behavior.

## The problem with one boolean

`offline.mode` currently carries two unrelated meanings: "the user asked for offline" and "the
network is unusable". Only the first exists today, so a device with no signal, or a healthy device
talking to a down server, gets endless spinners, failed downloads, and a sync queue grinding through
every job. The signal needed to fix it is already collected and then discarded — `netReachable` is a
local variable inside a `useEffect` in `apps/mobile/src/sync/SyncProvider.tsx`, and
`classifySyncError` already returns `isOffline` but nothing outside the sync queue can see it.

## Three concepts

| Concept             | Meaning                                                        | Who reads it                     |
| ------------------- | -------------------------------------------------------------- | -------------------------------- |
| `offline.mode` pref | User-forced. Refuse the network, steer tabs, persistent banner | Hard network gates, tab steering |
| Connectivity state  | `online` / `device_offline` / `server_unreachable`             | Sync queue, downloads, banner    |
| Effective offline   | `userForced                                                    |                                  | connectivity !== 'online'` | Screen fallback copy, outbox replay |

## Locked decisions

- **Auto-offline is softer than the toggle.** It backs off background sync, pauses in-flight
  downloads, and makes failures read as offline — but still permits user-initiated requests, health
  probes, and **remote streaming**. An attempt is the only reliable way to learn we are back, and a
  media host can be reachable when our API is not.
- **Auto-offline never steers navigation.** No forcing the Downloaded chip, no rewriting remembered
  tabs or sections. On a flaky signal that would make chips jump under the user. Only the manual
  toggle steers.
- **Cause-specific, brand-neutral copy.** "No internet connection" vs "Can't reach the server". No
  `{brand_name}` interpolation: mobile has no brand config today, and this copy must not create the
  need for one.
- **Never a toast, dialog, or push.** The bottom-chrome strip is the only announcement. It appears
  only after the entry debounce and clears on the first successful request.
- **The More switch keeps showing only the pref.** An auto state rendered into the switch would let
  the user "turn off" something they never turned on, and would fight the durable value.
- **No account sync.** Connectivity is device-local and ephemeral — not even a pref.

## Anti-flapping

Asymmetric, because the two directions have different reliable evidence.

- **Enter** on either NetInfo reporting disconnected, or N consecutive offline-classified request
  failures. Hold for a short debounce before anything becomes visible.
- **Leave** only on a **successful request**. NetInfo reports "connected" on captive portals and
  dying signal, so its word alone is not enough. On NetInfo reconnect, schedule a probe against the
  unauthenticated `GET /api/v2/health` on exponential backoff, capped. Any user-initiated action
  probes immediately — the sync queue already does this when a `priority: 'user'` job arrives while
  parked.
- A minimum dwell time in each state, so the strip cannot flicker.

## No new dependency

`@react-native-community/netinfo` (`11.4.1`, MIT, react-native-community org — the successor to the
`NetInfo` API that shipped in React Native core) is already a dependency and already subscribed in
`SyncProvider.tsx`. This work relocates that subscription. No package is added and no native rebuild
is required.

NetInfo is an accelerator, not the authority. Because the machine exits offline only on a successful
request, NetInfo is a hint that triggers a probe. It earns its place on two points a pure-JS
approach cannot match: instant entry on airplane mode or lost signal (a request on no signal
otherwise burns its full 20s timeout), and an OS push the moment an interface returns, without which
exit depends entirely on the backoff tick. Connection type (wifi / cellular / metered) is a third
capability, unused today but needed by any future wifi-only download policy.

`AppState` (React Native core, no library) is a second free reconnect trigger through the listener
`SyncProvider` already has. If NetInfo were removed or regressed, the machine still converges through
probes, just more slowly. Keep it that way: no behavior may depend on NetInfo being correct.

## Behavior — forced vs auto

| Surface                      | Manual toggle on                 | Auto-offline                                      |
| ---------------------------- | -------------------------------- | ------------------------------------------------- |
| Bottom-chrome strip          | "Offline mode is on", persistent | Cause-specific, after debounce, clears on success |
| More → Features switch       | On                               | Unchanged (off)                                   |
| Background sync queue        | Parked                           | Parked, resumes on probe success                  |
| API helpers                  | Refuse immediately               | Attempt; failures classify as offline             |
| Remote playback fallback     | Refused (local `file://` only)   | **Allowed**                                       |
| New download enqueue         | Rejected (`offline_mode`)        | Queued; starts when back                          |
| In-flight downloads          | Paused                           | Paused, auto-resume on restore                    |
| Playback outbox replay       | Stopped                          | Stopped, resumes on restore                       |
| Podcast detail section       | Forced to Downloaded             | **Unchanged** (remembered tab kept)               |
| Browse / Search / Home Clips | Unavailable fill                 | Attempt, then offline-flavored error + Retry      |

## Acceptance criteria

- Losing signal shows the "no internet connection" strip after the debounce, not immediately, and a
  sub-debounce blip shows nothing at all.
- NetInfo reporting reconnect does **not** by itself clear the strip; a successful request or probe
  does.
- With the device online and the API stopped, the strip reads "can't reach the server", the sync
  queue parks instead of walking every job into the same wall, and it resumes when the API returns.
- Remote streaming still plays while auto-offline; it does not while the manual toggle is on.
- A podcast detail screen opened during auto-offline keeps its remembered section chip.
- No toast, dialog, or push ever fires for a connectivity change.
- Turning the manual toggle on and off behaves exactly as it does today.

## Web parity references

Mobile-only. Web has no offline download library and no equivalent mode — intentional divergence
([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)).

## Verification

```bash
# Mobile
npm run build:packages
npm --prefix apps/mobile run test

# Mobile Maestro
npm run mobile:e2e:test -- offline-mode
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
