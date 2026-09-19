# 03 — Offline status hook and three-state banner

**Cursor model:** Codex 5.3
**Reasoning:** medium

Detail doc:
[779-automatic-offline-detection](/docs/proposals/mobile/_master-plan_/phase-2/details/779-automatic-offline-detection.md)
· Decisions: [00-SUMMARY.md](00-SUMMARY.md) · Depends on: [01](01-connectivity-machine-and-store.md),
[02](02-sensors-and-sync-wiring.md)

May run in parallel with [04](04-downloads-and-outbox-gating.md) **if** two agents are splitting the
files. One agent doing both should run them in sequence.

## Scope

Make the derived state visible — and only visible. This step adds no new network gate and changes no
navigation default.

## Files

### `apps/mobile/src/prefs/offlineMode.ts`

Add `useOfflineStatus()` returning the shape screens actually need:

```typescript
export type OfflineStatus = {
  /** Why the app is offline, for copy selection. `null` when online. */
  cause: 'device_offline' | 'forced' | 'server_unreachable' | null;
  /** The user's toggle. The only thing that may steer tabs or sections. */
  isForced: boolean;
  /** Forced or derived. Drives fallback copy, never navigation. */
  isOffline: boolean;
};
```

`isForced` wins the `cause` when both apply — the user's deliberate choice is the more useful
explanation, and it is the one they can undo from More.

Keep `isOfflineModeEnabled()`, `useOfflineMode()`, `writeOfflineModeEnabled()`, and
`OfflineModeEnabledError` exactly as they are. ~25 call sites depend on them, and the hard network
gates must stay pref-only.

Re-export the new surface from `apps/mobile/src/prefs/index.ts` alongside the existing offline
exports. Do not create a re-export-only file for `net/`
([`avoid-reexport-wrappers`](/.cursor/rules/avoid-reexport-wrappers.mdc)) — import `net/connectivity`
directly where needed.

### `apps/mobile/src/components/screen/OfflineModeBanner.tsx`

Currently renders one string when the pref is on. Extend it to three states off `useOfflineStatus()`.

Map copy with an **exhaustive `switch`** on `cause`, not a nested ternary with a default branch —
a fallback branch is how a dismissed or `null` state silently acquires the wrong message
([`i18n-user-facing-strings`](/.cursor/rules/i18n-user-facing-strings.mdc) § Reason-mapped copy).
Return `null` when `isOffline` is false.

Keep the existing warning tokens, the `caption` typography, and `testID="offline-mode-banner"` so
current E2E keeps passing. Add a distinguishing `testID` for the auto states — the 05 Maestro flow
needs to tell "offline mode is on" from "no internet connection".

Accessibility: the strip already sets `accessibilityRole="text"` and `accessible`. A message that
appears because of a state change needs to be announced, not just painted — add
`accessibilityLiveRegion="polite"` (Android) and keep the label the full sentence
([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

Placement in the bottom chrome is already correct at both call sites in
[`navigation/index.tsx`](/apps/mobile/src/navigation/index.tsx) (sync → offline → segment →
mini player). Do not move it.

### `apps/mobile/src/components/screen/OfflineModeFeaturesHeader.tsx`

**Unchanged.** The More switch shows only the pref. An auto state rendered into the switch would let
the user "turn off" something they never turned on. Confirm it still reads `useOfflineMode()` and not
the new hook.

### `packages/i18n-catalog/mobile/originals/en-US.json`

Add two keys inside the existing `settings.offline_mode` block, next to `banner`:

- `banner_no_connection` — "No internet connection"
- `banner_server_unreachable` — "Can't reach the server"

Sentence case ([`ui-copy-sentence-case`](/.cursor/rules/ui-copy-sentence-case.mdc)) and
brand-neutral — no `{brand_name}`, no product name. Make a **targeted insertion**; do not rewrite the
file.

**Only edit `en-US.json`.** `.github/workflows/i18n.yml` translates `es`, `fr`, and `el-GR` on
`develop`. Do not hand-write the other locales.

### `apps/mobile/src/lib/offlineModeViews.ts`

No behavior change. Update the doc comments so the forced-only boundary is legible to the next
reader: `resolvePodcastSectionForOfflineMode` and the `OfflineUnavailableSurface` helpers are driven
by `isForced`, never by the derived state. Screens that cannot work offline keep attempting under
auto-offline and surface an offline-flavored error with Retry through their existing `ListError` /
`RetryableError` chrome.

Write those comments forward-looking — state the rule, do not narrate this change
([`comments-future-forward`](/.cursor/rules/comments-future-forward.mdc)).

## Ownership

Files this step owns: the five above.

Do not touch: `downloadManager.ts`, `playbackOutboxRepository.ts`, `syncErrorClassification.ts`,
`SyncProvider.tsx`, or anything under `net/`.

## Do not

- Do not change any screen's remembered tab, section, or chip behavior.
- Do not add a toast, dialog, snackbar, or push for a connectivity change. The strip is the only
  announcement.
- Do not switch bottom tabs or navigate on a connectivity change.
- Do not make the More switch reflect the derived state.
- Do not edit `es` / `fr` / `el-GR` catalogs or anything under `i18n/compiled/`.

## Verification

Operator commands only; do not run them.

```bash
npm run build:packages
npm --prefix apps/mobile run test
```
