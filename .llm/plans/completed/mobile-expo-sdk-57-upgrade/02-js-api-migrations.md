# 02 — JS API migrations (non-billing)

**Cursor model:** Codex 5.3 · **Reasoning:** high

## Goal

After Prompt 01, fix non-billing TypeScript / runtime call sites for
SDK 57: file-system legacy entry, Reanimated 4 / worklets, React 19 types,
notification handler fields, and safe-area / netinfo breaks.

## Ownership

- **Owns:** everything under `apps/mobile` **except** `src/billing/**`
- **Must not touch:** `apps/mobile/src/billing/**`, `package.json` pins
  (01 owns those), native plugins / modules (04 / 05)

Runs **before** Prompt 03 (sequential).

## Preconditions

- Prompt 01 complete (Expo 57 lockfile installed).

## Locked API choices

- File system → `expo-file-system/legacy` (keep `FileSystem.*` API surface).
  Do **not** migrate to the new File/Directory classes.
- Reanimated: if `runOnJS` is deprecated or removed in the installed 4.x,
  use `scheduleOnRN` from `react-native-worklets` (or the documented
  replacement in that package's types). Prefer the import that type-checks
  against the installed packages.
- Notifications: replace `shouldShowAlert` with `shouldShowBanner` +
  `shouldShowList` where the handler options type requires it.

## Files (required)

### File system → `expo-file-system/legacy`

Change the import only (keep `import * as FileSystem from '…'`):

1. `apps/mobile/src/downloads/downloadManager.ts`
2. `apps/mobile/src/playback/PlaybackProvider.tsx`
3. `apps/mobile/src/downloads/downloadStorageStats.ts`
4. `apps/mobile/src/screens/more/MoreOpmlScreen.tsx`
5. `apps/mobile/src/hooks/useOpmlImport.ts`
6. `apps/mobile/src/lib/share/shareRemoteFile.ts`
7. `apps/mobile/src/lib/playback/resolvePlaybackUrl.ts`

Also update any unit tests that mock `'expo-file-system'` to mock
`'expo-file-system/legacy'` (e.g. `resolvePlaybackUrl.test.ts`).

### Reanimated 4

1. `apps/mobile/src/components/player/FullPlayerScrubber.tsx` — `runOnJS`
   usage
2. `apps/mobile/src/components/reorder/ReorderableSections.tsx` — shared
   values / gesture imports

### Notifications

Search and fix handler option shapes:

- `apps/mobile/src/push/notificationRouting.ts`
- `apps/mobile/src/push/fcmTransport.ts`
- `apps/mobile/src/downloads/autoDownloadBackgroundNotificationTask.ts`
  (if it sets `shouldShowAlert`)

### React 19 / types

Fix whatever `tsc --noEmit` reports outside `src/billing/**`:

- Replace global `JSX` namespace usage with `React.JSX` where required
- Give every `useRef()` an initial argument (`useRef(false)`, `useRef(0)`,
  `useRef<T | null>(null)`, etc.)
- Remove / replace `defaultProps` on function components if types reject them

Do not bulk-rewrite unrelated screens. Only fix errors the type-check (or
an obvious SDK 57 break) surfaces.

### Safe area / NetInfo

If type-check or compile fails on:

- `react-native-safe-area-context` 5.x APIs
- `@react-native-community/netinfo` 12.x APIs

fix call sites (imports, option names) without changing product behavior.

## Steps

1. Apply the seven legacy file-system import changes + test mocks.
2. Fix Reanimated / worklets in the two components.
3. Fix notification handler fields.
4. Implement React 19 / safe-area / netinfo fixes as needed outside billing
   (IDE diagnostics or a focused type-check are fine).
5. Do **not** run full Checkpoint A here — Prompt 03 runs it after billing
   lands so the tree is complete. Optional: `npm run type-check:mobile` to
   catch non-billing errors early; fix what you own, then continue.

## Done when

- No remaining `from 'expo-file-system'` (non-legacy) under `src/` except
  comments / docs deferred to 07
- Scrubber / reorder type-check against Reanimated 4
- Notification handlers use the SDK 57 option names
- Agent did not modify `src/billing/**`

## Agent verify

No mandatory full gate in this prompt. Summarize files changed. Checkpoint A
runs at the end of Prompt 03.
