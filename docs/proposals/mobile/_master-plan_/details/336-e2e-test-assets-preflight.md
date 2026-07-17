# 336-e2e-test-assets-preflight

**Master step:** 5.22
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- When Maestro flows need real media (add-by-RSS play, later episode play), fail fast if
  `tools/test-assets` is not listening on **2111**.
- Mirror the API `fixturesEnabled` preflight pattern in `scripts/mobile/e2e-test.sh`.
- Prefer explicit operator leave-running tab (do not auto-spawn inside Maestro).

## Locked decisions

| Item       | Decision                                                                |
| ---------- | ----------------------------------------------------------------------- |
| Trigger    | `flow_needs_test_assets` basenames (at least `add-by-rss`)              |
| Check      | TCP listen on 2111 + optional GET of a known fixture path               |
| Auto-start | No — operator runs `npm run mobile:e2e:test-assets` (same as Metro/API) |

## Acceptance criteria

- `e2e-test.sh` exits with a clear error when assets are required and `:2111` is down
- HOW-TO-RUN lists test-assets as required for playback flows
- `mobile-e2e-screenshots` skill mentions the leave-running tab

## Verification

```bash
rg -n 'flow_needs_test_assets|2111' scripts/mobile/e2e-test.sh apps/mobile/e2e/HOW-TO-RUN.md
```

## Depends on

- 5.21 / 335

## Blocks

- 9.29 / 288
