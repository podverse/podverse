# 107-bridge-command-serialization-tests

**Master step:** 2.28
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Add a unit-testable pure TS layer for bridge command serialization (load / loadAndStart /
  attachVideoSurface / animateVideoSurface payloads) with Vitest — **no native** in tests.
- Place tests beside the pure module (engine `src/` or `apps/mobile/src/bridge/`).

## Architecture notes

- Mobile is excluded from root `test:unit` until RN Vitest is configured — either enable a scoped
  Vitest config for this package/path or document operator command `npm run test -w …` once a
  workspace script exists. Prefer adding a small vitest project under the engine package if that
  keeps Node-only tests green in CI later.

## Edge cases

- Reject malformed rects / missing url in the pure layer (throw or Result — match bridge style).
- Keep serialization stable for Android/iOS arg order.

## Acceptance criteria

- Vitest covers happy path + invalid payload cases for new video + loadAndStart commands.
- Tests do not import Expo native modules.
- Operator can run the scoped test command from monorepo root.

## Web parity references

- [097-bridge-attach-video-surface](./097-bridge-attach-video-surface.md)
- [104-bridge-load-and-start](./104-bridge-load-and-start.md)

## Verification

```bash
# Exact script depends on where Vitest is wired — prefer engine package if added
npm run test -w apps/mobile
```

## Depends on

- 2.18–2.19, 2.25 APIs (may land in same phase after those prompts)
