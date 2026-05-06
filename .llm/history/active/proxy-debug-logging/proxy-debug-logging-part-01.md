# proxy-debug-logging

**Started:** 2026-05-06

**Author:** Cursor Agent

**Context:** Reduce server/dev-terminal noise when `/api/proxy` image fetches fail; gate diagnostics with shared `LOG_LEVEL=debug` (helpers `isEnvLogLevelDebug`), not a proxy-specific flag.

---

### Session 1 - 2026-05-06

#### Prompt (Developer)

when img loading errors happen in the proxy we do not want it to create noise. we only want to log these failures if debug mode is enabled. otherwise we want proxy to be silent.

#### Key Decisions

- `/api/proxy` uses `PROXY_DEBUG` (`true`/`1`) for `console.warn` diagnostics; otherwise no per-request failure logs on the server.
- Next.js dev: `next.config.mjs` sets `logging.incomingRequests.ignore` for `/api/proxy` to cut terminal spam when upstream images fail.
- Documented `PROXY_DEBUG` in `ENV.md` and `apps/web/sidecar/.env.example`; optional boolean in `scripts/validate-env.ts`.

#### Files Created/Modified

- `apps/web/src/app/api/proxy/route.ts`
- `apps/web/next.config.mjs`
- `apps/web/scripts/validate-env.ts`
- `apps/web/sidecar/.env.example`
- `apps/web/ENV.md`

---

### Session 2 - 2026-05-06

#### Prompt (Developer)

we don't want a PROXY_DEBUG we want a more generic LOG_LEVEL like other apps in podverse have

#### Key Decisions

- Removed `PROXY_DEBUG`; `/api/proxy` failure diagnostics use `isEnvLogLevelDebug()` from `@podverse/helpers` (Winston-style `LOG_LEVEL=debug` on the Next server), same convention as `apps/api`.
- Renamed helper to `logProxyFailureDiagnostics`; `validate-env` documents optional `LOG_LEVEL` under General (replacing `PROXY_DEBUG` validation).
- `apps/web/sidecar/.env.example`: logging section with `LOG_LEVEL=`; `ENV.md` updated accordingly.

#### Files Created/Modified

- `apps/web/src/app/api/proxy/route.ts`
- `apps/web/scripts/validate-env.ts`
- `apps/web/sidecar/.env.example`
- `apps/web/ENV.md`
- `.llm/history/active/proxy-debug-logging/proxy-debug-logging-part-01.md`
