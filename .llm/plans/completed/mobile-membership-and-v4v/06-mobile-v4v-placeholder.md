# 06 — V4V placeholder screen

**Cursor model:** Auto (small, self-contained)
**Master step:** Track 19.6 (565) — **placeholder-only slice** (full LNURL flow stays `_TBD_`).
**Ship bar:** The full-player V4V button opens a dedicated **placeholder screen** instead of the inline
"coming soon" notice. Independent of the membership work — can be done first.

## Why

The operator wants V4V to "just be a button that triggers a placeholder screen." Today
`FullPlayerScreen` shows a config-gated inline notice (`full-player-v4v-notice` → `coming_soon`).

## Scope

1. **New screen** `apps/mobile/src/screens/v4v/V4vInfoScreen.tsx` — a simple placeholder (title +
   short "Value-for-value boosts are coming soon" copy via i18n). `testID="v4v-info-screen"`.
2. **Register** it in the navigator (`apps/mobile/src/navigation/index.tsx`): add a `V4vInfo` route
   (root stack or Home stack; pick a home so it's reachable from the full player), add to the param
   list and, if appropriate, a deep-link path (`v4v`). Follow existing screen-registration patterns.
3. **Rewire the full-player button** (`FullPlayerScreen.tsx`): the existing `full-player-v4v` button
   navigates to `V4vInfo` instead of toggling `isV4vNoticeVisible`. Remove the inline
   `full-player-v4v-notice` block. Keep the button **visible** (recommended: keep `isV4vEnabled` as a
   kill-switch but default it visible — confirm the default in `config/env.ts`; if it is off by
   default, flip the default so the button shows). Keep `testID="full-player-v4v"`.
4. **i18n:** V4V screen copy via the mobile catalog (reuse `media_player.value_for_value` for the
   label; add a screen-body key).

## Guards

- Keep `full-player-v4v` testID; add `v4v-info-screen`.
- No LNURL / wallet / payment logic — placeholder only (full flow remains 565 `_TBD_`).
- Strict equality; no `as`; `import type`.

## Acceptance

- Tapping the full-player V4V button navigates to the V4V placeholder screen.
- The inline "coming soon" notice is gone; the button is visible by default.

## Verification (operator)

```bash
npm run mobile:e2e:test -- player
```
