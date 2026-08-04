# Unit tests for Track 14–16 pure logic

**Phase slug:** `mobile-track14-16-unit-tests`
**Covers:** deep-link path map (15.3), notification tap-routing target extraction (14.4/14.8),
share-URL parity (15.5), unified prefs store (16.1).
**Ship bar:** Node-only vitest coverage for the new **pure** logic added on
`feature/mobile-app-init-12`. No behavior change to app code beyond small pure-core extractions
needed to keep tests out of the RN/Expo import graph.

## Why

`apps/mobile` has a node-only vitest harness (`apps/mobile/vitest.config.ts`) with a colocated
`*.test.ts` convention (10 existing tests) and repo gates (**unit-test-new-code-gate**,
**feature-implementation-testing**, **unit-test-priority-confident**) that require tests for new
critical logic. Track 14–16 shipped the routing/prefs/share **pure** logic with only two Maestro
happy-path screenshots — no coverage of fallbacks, malformed inputs, or the mapping table.

## Constraint (read first)

`vitest.config.ts` runs `environment: 'node'` with a **narrow `include` allowlist** and deliberately
avoids modules that import React Native / Expo / config. Therefore:

- `navigation/deepLinking.ts` is already pure (no imports) → test directly; just add to `include`.
- `push/notificationRouting.ts` imports `expo-notifications` → **extract** the pure
  `extractNotificationTargetPath` + constants into `push/notificationTarget.ts` (no expo import) and
  re-export from `notificationRouting.ts`; test the pure module.
- `lib/share/shareNowPlaying.ts` imports `getMobileConfig` (→ `react-native`) → **extract** a pure
  `lib/share/shareUrl.ts` taking `webBaseUrl` explicitly; keep `shareNowPlaying.ts` as the thin
  config-reading wrapper; test the pure module.
- `prefs/prefsStore.ts` imports `@react-native-async-storage/async-storage` → test with
  `vi.mock('@react-native-async-storage/async-storage', …)` (in-memory map); design-tokens + helpers
  imports are node-safe.

Every new test file must be added to the `include` array in `apps/mobile/vitest.config.ts`.

## Model mix

| Model     | Steps                          |
| --------- | ------------------------------ |
| Codex 5.3 | 01 (routing + push target)     |
| Codex 5.3 | 02 (share URL + prefs store)   |

## Out of scope

- Native/Expo integration (permission dialogs, real FCM/APNs tokens) — device/manual + Track 20.
- Changing runtime behavior; extractions must be behavior-preserving re-exports.
