# 766-enclosure-source-picker

**Master step:** P2.1.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

User-facing alternate enclosure / source picker on mobile, matching web's
[`SourceSelectors`](apps/web/src/components/SourceSelectors/SourceSelectors.tsx) /
[`AlternateEnclosureButton`](apps/web/src/components/MediaPlayer/) affordance.

Depends on: [765](765-enclosure-selection-session-state.md).

### When shown

Only when `labeledEnclosures.length > 1` (same gate as web). Single-enclosure items show nothing.

### Surfaces

| Entry                         | Pattern                                              |
| ----------------------------- | ---------------------------------------------------- |
| Full player More sheet        | Action in [`FullPlayerMoreSheet`](apps/mobile/src/components/player/FullPlayerMoreSheet.tsx) |
| Row more menu                 | Optional action in [`MediaRowActions`](apps/mobile/src/components/player/MediaRowActions.tsx) when playing / queuing from a list |

Use existing [`MoreMenu`](apps/mobile/src/components/primitives/MoreMenu.tsx) (or a small dedicated
modal built on the same bottom-sheet pattern). Do **not** add `@gorhom/bottom-sheet` or
`ActionSheetIOS`-only UI.

### Contents

- One row per labeled enclosure (bitrate / height / type / title from helpers' labels).
- Nested source choice when an enclosure has multiple `item_enclosure_sources` (web does).
- Selecting a row updates session `EnclosureSelectedParams` and triggers reload via 767's switch
  path when that lands; until 767, update params and call a simple reload seek-0 is acceptable
  **only if 767 is the next prompt in the same set** — otherwise stub a TODO that 767 replaces.
  Prefer implementing 766 UI + wiring params, and let 767 own the resume seek in the same plan set
  execution order.

### Copy

Prefer existing keys (`media.player.*` / source-selector strings on web). Add mobile overlay keys
only when shared keys cannot render on RN. Sentence case.

### Accessibility

Every row has `accessibilityRole` / label; selected state via `accessibilityState.selected`
([`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)).

## Acceptance criteria

- Picker appears only for multi-enclosure items from player More and (where wired) row more.
- Selection updates session state used by URL resolution.
- No new sheet library.

## Web parity references

- [`SourceSelectors.tsx`](apps/web/src/components/SourceSelectors/SourceSelectors.tsx)
- [`AlternateEnclosureButton.tsx`](apps/web/src/components/MediaPlayer/)
- E2E: `apps/web/e2e/media-player-alternate-enclosure.spec.ts`

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- alternate-enclosure
open .artifacts/mobile-e2e-reports/latest/failures.json
```
