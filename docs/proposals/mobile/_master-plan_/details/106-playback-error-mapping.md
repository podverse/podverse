# 106-playback-error-mapping

**Master step:** 2.27
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Define a stable native→JS error taxonomy (`code` + `message`) and map to
  `@podverse/helpers` playback error shapes (or a thin mobile DTO that mirrors them).
- Replace ad-hoc native strings with documented codes (network, unsupported, file-not-found,
  decode, unknown).

## Architecture notes

- Keep mapping in a pure TS module under the engine package or `apps/mobile/src/bridge/` so Vitest
  can cover it without native (pairs with 2.28).
- RN UI shows localized user strings via i18n keys keyed off codes — do not pass raw native
  messages to users when a catalog key exists.

## Edge cases

- Empty native message: still emit code.
- Non-enumerated native codes: map to `unknown` without dropping detail in logs.

## Acceptance criteria

- Documented code list in README / bridge contract.
- JS adapter normalizes events through the mapper.
- Unit tests for mapping table (no native).

## Web parity references

- `@podverse/helpers` playback / request error patterns
- [089-native-to-js-events](./089-native-to-js-events.md)

## Verification

```bash
# After tests land (operator)
npm run test -w apps/mobile
# or package path chosen for pure mapper tests
```

## Depends on

- 2.10 events (`done`)
