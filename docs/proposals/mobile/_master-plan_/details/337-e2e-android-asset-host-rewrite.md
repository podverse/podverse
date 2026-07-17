# 337-e2e-android-asset-host-rewrite

**Master step:** 5.23
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Seed and API fixture enclosure URLs use `http://localhost:2111/...` (web parity).
- On Android emulator, `localhost` is the emulator itself — rewrite to `10.0.2.2` when
  `EXPO_PUBLIC_MOBILE_E2E=1`, matching the API base URL pattern in `dev-e2e.sh`.
- iOS E2E and non-E2E builds pass URLs through unchanged.

## Locked decisions

| Item  | Decision                                                          |
| ----- | ----------------------------------------------------------------- |
| When  | Only when `isMobileE2eFromEnv()` is true and platform is Android  |
| What  | Host `localhost` / `127.0.0.1` on port **2111** → `10.0.2.2`      |
| Where | Shared helper used by add-by-RSS (and future) playback load paths |

## Acceptance criteria

- `resolveE2eMediaUrl` (or equivalent) exists under `apps/mobile/src/lib/e2e/`
- `useAddByRssPlayback` loads the rewritten URL on Android E2E
- TEST-ENV documents the rewrite

## Verification

```bash
rg -n 'resolveE2eMediaUrl|10\.0\.2\.2:2111' apps/mobile/src/
```

## Depends on

- 5.20 / 079 (E2E env flag), 5.21 / 335

## Blocks

- 9.29 / 288 (Android play path)
