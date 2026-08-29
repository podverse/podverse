# 252-home-play-action-stub

**Master step:** 8.13
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add a play/queue action affordance to playable Home rows (episodes, clips, tracks).
- Wire to a thin playback hook interface that is **stubbed** until Track 10 (queue) and Track 11
  (player) land; the stub may call the existing native bridge `loadAndStart` for a basic play, or
  no-op with a toast if the engine contract for that kind is not ready.
- Keep the call site stable so Track 10 can replace the stub without touching row UI.

## Acceptance criteria

- Play affordance present on playable rows with `testID` (e.g. `home-row-play`)
- Stub is isolated behind a hook; no queue/auto-queue logic inlined in the row
- No crash when tapped pre-Track-10; graceful behavior documented

## Web parity references

- Web play buttons in list rows ([`apps/web/src/components/Media`](/apps/web/src/components/Media))
- Bridge: [`apps/mobile/src/bridge`](/apps/mobile/src/bridge);
  policy `@podverse/playback-core` (see mobile-playback skill)

## Verification

```bash
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
