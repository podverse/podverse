## Started

- **Author**: Agent
- **Context**: Podverse web image proxy toggle

### Session 1 - 2026-05-06

#### Prompt (Developer)

make the image proxy optional, and turn it off by default

#### Key Decisions

- Added `NEXT_PUBLIC_IMAGE_PROXY_ENABLED` (optional boolean string); runtime defaults to `false` when unset via `applyWebRuntimeEnvDefaults`.
- `NEXT_PUBLIC_PROXY_USER_AGENT` is required only when image proxy is `true`; otherwise optional/blank.
- `/api/proxy` returns 403 when proxy disabled to reduce SSRF surface.
- Updated `Image` / `ImageNonReact` to use proxy only when enabled and not `skipProxy`.

#### Files Created/Modified

- `apps/web/src/config/runtime-config.ts`
- `apps/web/src/config/runtime-config-store.ts`
- `apps/web/src/config/index.ts`
- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/components/Image/ImageNonReact.tsx`
- `apps/web/src/app/api/proxy/route.ts`
- `apps/web/sidecar/src/server.ts`
- `apps/web/sidecar/.env.example`
- `apps/web/sidecar/.env`
- `apps/web/ENV.md`
- `infra/k8s/base/web/source/web-sidecar.env`
- `tools/web-perf/bundle-analyzer/src/env-config.ts`
- `tools/web-perf/lighthouse/.env.web`
- `tools/web-perf/lighthouse/.env.web.example`
