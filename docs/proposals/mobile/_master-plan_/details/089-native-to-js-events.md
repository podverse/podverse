# 089-native-to-js-events

**Master step:** 2.10
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Emit JS events: `playbackState`, `progress`, `ended`, `error`, `stalled` from both platforms.
- Document payload shapes (state enum, position/duration seconds, error code/message).
- Throttle `progress` sensibly (e.g. 250–1000ms).

## Architecture notes

- Events are the input to future RN orchestrators (queue advance) — keep names stable.
- Prefer DeviceEventEmitter / TurboModule event pattern consistent with Expo modules.

## Acceptance criteria

- Step 2.10 complete per master plan
- JS can subscribe and receive events on iOS and Android
- `ended` fires at natural completion

## Web parity references

- Web orchestrator ended handling in `NonLiveMediaOrchestrator` / related hooks

## Verification

```bash
# Manual: log events from a temporary Hello World button/hook
```
