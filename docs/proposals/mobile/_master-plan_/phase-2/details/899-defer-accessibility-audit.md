# 899-defer-accessibility-audit

**Master step:** P2.3.10
**Model (author + implement):** Opus 5
**Status:** deferred to a future phase

## Why deferred

Bringing the **whole** product to a defensible screen reader standard is a cross-surface program in
its own right — `apps/web`, `apps/management-web`, `apps/mobile`, and `packages/ui`, plus tooling and
CI. Folding it into the Phase 2 Home and Search work would either bloat that scope or produce a
shallow pass.

**This deferral does not excuse new work.** Everything built from now on must be accessible when it
lands, per
[`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc). This document covers
the **existing** surface area only.

## Current state (measured August 2026)

| Surface                   | Files with any a11y attribute | Verdict      |
| ------------------------- | ----------------------------- | ------------ |
| `apps/mobile/src`         | 27 of 75                      | Poor         |
| `apps/web/src`            | 56 of 674                     | Partial      |
| `apps/management-web/src` | 8 of 83                       | Poor         |
| `packages/ui/src`         | 64 of 198                     | Partial–good |

Specific findings:

- **Media player is the worst surface on both platforms.** 23 web button components, 6 with
  `aria-label`. Jump-back, increment-forward, next-track, and the settings gear are icon-only and
  unnamed.
- **Mobile has no hints, no live regions, and no `importantForAccessibility`.** Tabs and filter chips
  set `testID` but not `accessibilityRole` or selected state, so assistive technology cannot tell
  which one is active.
- **`packages/ui` `Modal` has correct dialog semantics but no focus trap**, no `aria-labelledby`
  pointing at its header, and no initial focus management.
- **No `sr-only` / visually-hidden utility exists**, so apps cannot expose context to screen readers
  without showing it visually.
- **No automated gate:** `eslint-plugin-jsx-a11y` is not configured, there is no axe integration in
  Playwright, and Lighthouse tooling is performance-only and not in CI.

### Nested accessible `Pressable` — needs VoiceOver verification first

React Native's `Pressable` defaults to `accessible={true}`, and on iOS an accessible view's children
are **not** exposed individually. Two places nest interactive content inside a labeled outer
`Pressable`, which may make the inner controls unreachable under VoiceOver:

| Location                                                | Risk                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/mobile/src/components/player/MiniPlayer.tsx`      | Outer expand `Pressable` wraps the inner play/pause `Button` |
| `apps/mobile/src/components/player/MediaRowActions.tsx` | Labeled backdrop `Pressable` wraps the sheet's action rows   |

Both were left unchanged on purpose. The obvious fix — `accessible={false}` on the wrapper — trades
away the wrapper's own tap target (expand the player, tap-outside-to-dismiss) for reachable children,
and which trade is right depends on how VoiceOver actually traverses each one. **Verify on a device
before changing either.** The inner gesture-swallowing wrapper in `MediaRowActions`, which was never
meant to be a control, was already set to `accessible={false}`.

## Scope when scheduled

Sequence roughly in this order — the first two change outcomes fastest because they are central.

1. **Shared primitives first.** Fix `packages/ui` (`Modal` focus trap and labelledby, `Table`
   semantics, an `sr-only` utility) and mobile `primitives/` so every consumer improves at once.
2. **Automated gates.** Add `eslint-plugin-jsx-a11y`, add axe assertions to representative Playwright
   specs, and decide whether accessibility becomes a blocking CI check. Gates prevent regression
   better than another manual pass.
3. **Media player**, web and mobile — highest traffic, worst coverage.
4. **Remaining screens**, surface by surface, including keyboard-only flows, focus order, modal focus
   return, form error announcement, and live regions for playback and toasts.
5. **Real assistive technology passes** — VoiceOver on iOS and macOS, TalkBack on Android — on tab
   navigation, the player, and at least one full listening flow. Automated tools do not catch
   ordering and announcement quality.
6. **Documentation** — a dedicated accessibility guide under `docs/`, since none exists today.

## Acceptance criteria (for the future phase)

- Shared primitives in `packages/ui` and `apps/mobile/src/components/primitives/` are accessible by
  default, so correct usage is the path of least resistance.
- Every interactive control across all four surfaces has an accessible name, role, and state.
- Accessibility linting runs in CI, and representative E2E specs assert against axe.
- A screen reader user can complete core flows end to end: find a podcast, subscribe, play an
  episode, and control playback.
- An accessibility guide exists in `docs/` and is referenced from the relevant AGENTS files.

## References

- Rule: [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc)
- `packages/ui/src/components/layout/Modal/Modal.tsx` — dialog semantics without a focus trap
- `apps/web/src/components/Media/Header/IconButton.tsx` — the label contract worth generalizing
- `apps/mobile/src/components/primitives/Button.tsx` — label defaulting worth generalizing
- `apps/web/src/components/MediaPlayer/Buttons/` — the largest concentration of unlabeled controls

## Verification

```bash
npm run lint
npm run test:unit
make e2e_test_report
npm run mobile:e2e:test:all
```
