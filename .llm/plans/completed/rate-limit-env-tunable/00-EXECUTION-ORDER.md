# Execution order — Rate-limit env tunable

Plans are mostly sequential: the parse helper must land before API wiring, and final env var
names from 02/03 must exist before the local override file in 04.

```
01-parse-helper
        │
        ▼
02-api-wire-config  ──┐
        │             │ (03 may start after 01; prefer after 02 so soft-cap naming stays aligned)
        ▼             │
03-workers-opml-soft-cap
        │
        ▼
04-local-env-override   (last — uses final env names; archives set)
```

## Recommended order

1. `01-parse-helper.md` — shared helper + unit tests (blocks everything else).
2. `02-api-wire-config.md` — all HTTP limiters + API config/examples/K8s.
3. `03-workers-opml-soft-cap.md` — workers soft-cap config consistency (API+workers shared key).
4. `04-local-env-override.md` — `rate-limit.env` override + `apply_override` + docs; archive set.

## Constraints

- Do not run tests during implementation; each plan lists operator verify commands. The final
  prompt ends with cumulative verification for the whole set.
- Do not run `npm install` / `npm ci` autonomously (native-deps-platform-mismatch); if Vitest
  fails with a missing darwin binary, surface it and ask the operator to run `npm install`.
- Keep each plan file under 300 lines.
- Do not change product max values unless a plan explicitly says so (defaults = current hardcoded).
- Do not add free-form window suffixes beyond the allowlist in `00-SUMMARY.md`.
