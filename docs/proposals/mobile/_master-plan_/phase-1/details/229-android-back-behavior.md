# 229-android-back-behavior

**Master step:** 7.10
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Android hardware/back gesture order:
  1. If full player open → dismiss full player
  2. Else if stack can pop → pop stack
  3. Else → default (may exit / stay on tab root)
- Mini player remains; back does not destroy engine.

## Acceptance criteria

- Documented + implemented via React Navigation `BackHandler` / nested behavior
- Full player dismiss tested manually on Android emulator

## Web parity references

- N/A (mobile OS affordance)

## Verification

```bash
npm run mobile:android -- --device Pixel_6_Pro_API_33
```
