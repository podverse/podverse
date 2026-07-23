# 498-media-row-actions-component

**Master step:** 9c.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Shared RN component(s) under `apps/mobile/src/components/` (e.g. `MediaRowActions` + action
  sheet) mirroring web intents from `PlayButtonRow` + `ItemRowMoreActions`.
- Props: play/pause, optional more-menu items with labels from shared/consumer i18n keys
  (`media_player.play`, `features.queue.queue_next`, `features.queue.queue_last`, playlist,
  mark played, etc.).
- Use existing primitives (`Button`) + tokens; no `@podverse/ui`.

## File paths

- Suggested: `apps/mobile/src/components/player/MediaRowActions.tsx` (or `components/media/`)
- Web refs: `apps/web/src/components/MediaPlayer/Buttons/PlayButtonRow.tsx`,
  `apps/web/src/components/Media/ItemRowMoreActions.tsx`

## Acceptance criteria

- One reusable API for play + more actions used by ≥2 call sites in 9c.3
- Action sheet / bottom sheet for overflow (RN-native), not a web port of hover menus
- No hardcoded English; labels passed localized
- Unit-friendly pure menu-item builders where practical

## Web parity references

- [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md §4](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)
- Web `PlayButtonRow`, `ItemRowMoreActions`, add-by-RSS episode row more menu

## Verification

```bash
# after implement: focused UI smoke via Maestro home or add-by-rss
npm run mobile:e2e:test -- hello-world
```

## Depends on

- 9c.1 inventory; 9b.6 primitives (`Button`)

## Implementation notes

- Component: `apps/mobile/src/components/player/MediaRowActions.tsx`.
  - Inline `Button` Play/Pause (`playLabel` passed localized) + optional **More options** trigger
    (`media.more_options`) opening a native bottom **action sheet** via RN `Modal`
    (`transparent` + `animationType="slide"` + backdrop `Pressable`, `onRequestClose` for Android
    back) — not a web hover-menu port.
  - Presses `stopPropagation()` so the control works inside a row `Pressable` without triggering row
    navigation (parity with `HomeFeedRow`'s existing behavior).
  - No `@podverse/ui`; primitives (`Button`) + `useTheme()` tokens only. No hardcoded hex — the
    only literal color is a neutral `rgba(0,0,0,0.5)` modal scrim (documented in-code as a backdrop,
    not a theme color).
- Pure builder: `buildMediaRowMoreActions(translate, handlers, { idSuffix })` returns localized
  `MediaRowMoreAction[]` in web-menu order using the **correct** keys
  (`features.queue.queue_next`, `features.queue.queue_last`, `features.playlist.add_to_playlist`,
  `features.history.mark_as_played`). Only intents with a handler are emitted, so a call site
  advertises exactly what mobile supports today. This fixes the Track 9c.1 mislabel (single Queue
  button labelled `queue_next` but appending last) by making next vs last distinct + correctly keyed.
  Side-effect free (`translate` is a `(key) => string`) so it is unit-testable without i18next.
- Reused testID scheme: `media-row-play*`, `media-row-more*`, `media-row-sheet*`,
  `media-row-action-<intent>*`; call sites may override `playTestID` / `moreTestID` to preserve
  existing E2E ids during the 9c.3 migration.
- No mobile unit-test harness yet (mobile excluded from root `test:unit` until RN Vitest); builder is
  kept pure/unit-ready for when the harness lands.
