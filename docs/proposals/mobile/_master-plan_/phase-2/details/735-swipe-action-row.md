# 735-swipe-action-row

**Master step:** P2.1.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Add a shared swipe-to-reveal action row for list items that need a destructive affordance without
a permanent trailing button.

### Component

- `SwipeActionRow` under `apps/mobile/src/components/primitives/` (or `list/`).
- Built on `react-native-gesture-handler` `Swipeable` (already in `apps/mobile/package.json`).
- Swipe left reveals a danger **Remove** action (token `button.dangerBg` / `dangerColor`).
- Also expose the same action via `accessibilityActions` so VoiceOver / TalkBack users are not
  swipe-only.

### Downloads usage

- In progress: cancel + delete partial file.
- Complete / failed: delete file + SQLite row.
- No visible Remove control on the row face.

### Also

- Add `Button` `variant="danger"` using design-token danger colors (needed by Settings Delete all
  and the swipe reveal).

## Acceptance criteria

- Downloads rows have no inline Remove; swipe left reveals Remove.
- Screen readers can invoke Remove without swiping.
- `Button` danger variant renders with danger token colors.

## Web parity references

- Mobile-only. Tokens: `@podverse/design-tokens` `button.dangerBg` / `dangerColor`.

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- library-downloads
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
