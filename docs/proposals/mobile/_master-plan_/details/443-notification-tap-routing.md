# 443-notification-tap-routing

**Master step:** 14.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Handle notification **tap** → navigate to the target episode/podcast/playlist screen, reusing the
  Track 15 deep-link path map (452) and cold-start replay buffer (453).
- Notification payloads carry a target URL or `{ type, id_text }`; translate to navigation via the
  same `getStateFromPath` mapping used for universal links.
- Handle both foreground/background tap and **cold-start** tap (app launched from notification).

## Acceptance criteria

- Tapping a notification routes to the correct screen (episode/podcast/playlist/profile).
- Cold-start notification tap replays after auth gate resolves (shares 453's pending buffer).
- Unknown/malformed payload falls back to Home without crashing.

## Web parity references

- Track 15: detail 452 (`getStateFromPath`), detail 453 (cold-start replay).
- `apps/mobile/src/navigation/index.tsx` (linking config).
- Push module from 440 (notification-open event source).

## Dependencies

- **Requires Track 15.3 (452) and 15.4 (453)** — implement deep links first.

## Verification

```bash
grep -rq "getInitialNotification\|onNotificationOpened\|notification.*route" apps/mobile/src
npm run test -w apps/mobile
```
