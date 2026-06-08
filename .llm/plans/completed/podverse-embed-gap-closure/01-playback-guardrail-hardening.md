# 01 — Playback guardrail hardening

## Objective

Enforce the full embed playback-mode contract from the original
`00-SUMMARY.md` at shared entry points — not only via incidental `AppChrome`
omissions.

## Scope

- Wire `skipAnonymousPlaybackRestore` and `skipMainAppLayoutMutations` where
  anonymous restore and layout mutators run.
- Add focused unit tests proving guardrail behavior.
- Do **not** change embed UX or route contracts.

## File targets

- `/apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx`
- `/apps/web/src/utils/mediaPlayer/mediaPlayerLayout.ts`
- `/apps/web/src/contexts/EmbedPlaybackMode.tsx` (only if a small export helper reduces duplication)
- `/apps/web/src/lib/embed/__tests__/embedPlaybackGuardrails.test.ts` (new) or extend existing embed tests

## Implementation contract

### Anonymous playback restore

In `AnonymousPlaybackRestoreController`, early-return the restore effect when
`useEmbedPlaybackGuardrails().skipAnonymousPlaybackRestore === true`.

Rationale: embed layout currently omits this controller, but the guard must live
on the controller so embed-mode is safe if mount topology changes.

### Main-app layout mutations

In `updateLayoutForMediaPlayer`, accept an optional second argument or read embed
guardrails via a thin wrapper:

- When `skipMainAppLayoutMutations` is true, return immediately without toggling
  `media-player-active` on `#sidebar`, `#page-wrapper`, or `#media-player`.

Update call sites in `MediaPlayerController.tsx` and `MediaPlayer.tsx` to pass
embed guardrail state (via hook at call site or inside `updateLayoutForMediaPlayer`
if it can import the hook safely — prefer hook at component level to keep
`mediaPlayerLayout.ts` free of React).

### Auto-queue (already done)

Confirm existing `skipAutoQueueMutations` checks in
`useMediaPlayerResourceUpdate.tsx` remain unchanged.

## Unit test requirements

Add tests (Vitest) that cover:

- `updateLayoutForMediaPlayer` does not add `media-player-active` when skip flag
  is true (mock DOM elements).
- Anonymous restore controller effect does not call restore when skip flag is true
  (mock hook/context; avoid full integration).

Keep tests behavior-focused; no over-granular permutations.

## Acceptance criteria

- All three guardrail flags on `EMBED_PLAYBACK_GUARDRAILS` are read by at least
  one runtime code path.
- Unit tests pass for the new guardrail behavior.
- No change to main-app (non-embed) playback behavior when guardrails are false.

## Operator verification

```bash
npm run lint
npm run test:unit
```
