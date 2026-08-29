# 090-js-bridge-adapter

**Master step:** 2.11
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement TS `NativePlaybackBridge` adapter calling the native module.
- Provide a thin hook or factory for screens to obtain the bridge.
- Keep all native calls behind this adapter (no direct NativeModules in screens).

## Architecture notes

- Future controls will call `playback-core` then this adapter — leave that wiring for later tracks.
- Spike UI may call the adapter directly from a debug screen.

## Acceptance criteria

- Step 2.11 complete per master plan
- Adapter implements the interface from 2.2
- Screens do not import native module directly

## Web parity references

- `apps/web/src/hooks/useMediaElementBridge.ts`
- [mobile-playback](/.cursor/skills/mobile-playback/SKILL.md)

## Verification

```bash
rg -n "NativeModules|TurboModule" apps/mobile/src --glob '!**/bridge/**'
# Expect no direct native player imports outside bridge adapter
```
