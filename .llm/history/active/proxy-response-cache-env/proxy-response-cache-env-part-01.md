# proxy-response-cache-env

**Started:** 2026-05-06  
**Author:** Session  
**Context:** Configurable `/api/proxy` Cache-Control max-age via env with default 86400s; K8s sidecar env.

### Session 1 - 2026-05-06

#### Prompt (Developer)

@podverse/apps/web/src/app/api/proxy/route.ts:127 Cache-Control should be set as an env var. the default value should be 86400 seconds. make sure k8s is updated as well

#### Key Decisions

- Introduced optional runtime-config key `PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS` (seconds); unset uses `DEFAULT_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS` (86400) applied in `getRuntimeConfig()` via `applyWebRuntimeEnvDefaults()` so defaults are not inlined in `config/index.ts`.
- `Cache-Control` uses `max-age` and `s-maxage` both set from `config.proxy.responseCacheMaxAgeSeconds`.
- Sidecar validates optional positive integer when set; documents default in validation message; includes key in `optionalKeys` and `buildRuntimeConfig` payload.
- Updated `infra/k8s/base/web/source/web-sidecar.env` with explicit `"86400"`; documented in `apps/web/sidecar/.env.example` and `apps/web/ENV.md`.

#### Files Created/Modified

- apps/web/src/app/api/proxy/route.ts
- apps/web/src/config/index.ts
- apps/web/src/config/runtime-config.ts
- apps/web/src/config/runtime-config-store.ts
- apps/web/sidecar/.env.example
- apps/web/sidecar/src/server.ts
- apps/web/ENV.md
- infra/k8s/base/web/source/web-sidecar.env
- .llm/history/active/proxy-response-cache-env/proxy-response-cache-env-part-01.md

### Session 2 - 2026-05-06

#### Prompt (Developer)

@podverse/apps/web/src/config/runtime-config.ts:1-2 is this really the best place for this? it seems kind of oddly placed

#### Key Decisions

- Moved `DEFAULT_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS` from `runtime-config.ts` (types/key lists only) to `runtime-config-store.ts` next to `applyWebRuntimeEnvDefaults()` where it is used.
- Sidecar sync comment now points at `runtime-config-store.ts`.

#### Files Created/Modified

- apps/web/src/config/runtime-config.ts
- apps/web/src/config/runtime-config-store.ts
- apps/web/sidecar/src/server.ts
- .llm/history/active/proxy-response-cache-env/proxy-response-cache-env-part-01.md

### Session 3 - 2026-05-06

#### Prompt (Developer)

i'm confused why @podverse/apps/web/src/config/runtime-config.ts:1-47 is the only one without NEXT* prefix. can we include NEXT* prefix for consistency? i don't think this cache rule is senstive and needs to be hidden from front end

#### Key Decisions

- Renamed `PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS` → **`NEXT_PUBLIC_PROXY_RESPONSE_CACHE_MAX_AGE_SECONDS`** everywhere (runtime-config types/lists, store defaults, `config/index.ts`, sidecar validation/keys, `.env.example`, `ENV.md`, K8s `web-sidecar.env`, Playwright E2E sidecar env).

#### Files Created/Modified

- apps/web/playwright.e2e-server-env.ts
- apps/web/src/config/index.ts
- apps/web/src/config/runtime-config-store.ts
- apps/web/src/config/runtime-config.ts
- apps/web/sidecar/.env.example
- apps/web/sidecar/src/server.ts
- apps/web/ENV.md
- infra/k8s/base/web/source/web-sidecar.env
- .llm/history/active/proxy-response-cache-env/proxy-response-cache-env-part-01.md
