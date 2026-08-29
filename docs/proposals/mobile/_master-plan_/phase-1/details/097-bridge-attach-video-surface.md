# 097-bridge-attach-video-surface

**Master step:** 2.18
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Add bridge API `attachVideoSurface(targetId, layoutRect)` on native modules +
  `NativePlaybackBridge` / JS adapter.
- `targetId`: stable string ids — at least `mini` and `full`.
- `layoutRect`: `{ x, y, width, height, cornerRadius? }` in density-independent window coordinates
  documented in the module README.

## Architecture notes

- Calling attach registers or updates a target; it must **not** call `load` / `destroy`.
- Idempotent: repeated attach with the same id updates the rect.
- Extend types in `apps/mobile/modules/podverse-media-engine/src/` and
  `apps/mobile/src/bridge/`.

## Edge cases

- Attach before first video item: store rect; show when video becomes active (2.23).
- Invalid rect (zero size): treat as hidden for that target.
- Unknown targetId: reject or no-op with documented behavior (prefer explicit error).

## Acceptance criteria

- JS can register `mini` and `full` rects without remounting the player.
- Native host uses the rect for the active target.
- Unit-testable serialization of rect payloads (feeds 2.28).

## Web parity references

- Master plan § Seamless video architecture
- [081-native-playback-bridge-interface](./081-native-playback-bridge-interface.md)
- [082-bridge-method-contract](./082-bridge-method-contract.md)

## Verification

```bash
# After RN wiring — layout updates visible on video play
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Depends on

- 2.16 / 2.17 hosts
