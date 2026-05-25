# Plan 06 — Web and management-web extension wiring

## Objective

Wire **Next.js apps** to OTEL SDK + **extension-prometheus sidecar** in pod; keep **runtime-config sidecar** free of `prom-client`.

---

## 1. Pod layout (unchanged roles, added container)

| Container | Image | Ports |
| --------- | ----- | ----- |
| web / management-web | `web-deploy` / `management-web-deploy` | 3002 / 3102 |
| runtime-config | `web-runtime-config` | 3001 / 3101 |
| extension-prometheus | `extension-prometheus` | 9464, 4318 |

Reference: [infra/k8s/base/web/deployment.yaml](infra/k8s/base/web/deployment.yaml).

---

## 2. Web app changes (`apps/web`)

| Task | File |
| ---- | ---- |
| Add Extensions to config | New or extend server env reader used at startup |
| Init OTEL (primary) | [apps/web/instrumentation.ts](apps/web/instrumentation.ts) — `initExtensions()` when `NEXT_RUNTIME === 'nodejs'` |
| HTTP metrics (primary) | Server instrumentation + route handlers via SDK integration points (not middleware-first) |
| Optional middleware (later) | Add `src/middleware.ts` only if runtime constraints are validated in implementation |
| Remove any in-app `/metrics` route | Do not add prom-client route in Next |
| Env example | [apps/web/.env.example](apps/web/.env.example) — pointer; [apps/web/sidecar/.env.example](apps/web/sidecar/.env.example) unchanged for config vars |
| K8s env | [infra/k8s/base/web/source/web.env](infra/k8s/base/web/source/web.env) — `EXT_OTEL_SERVICE_NAME=podverse-web` |

### Next config

[apps/web/next.config.mjs](apps/web/next.config.mjs):

```javascript
serverExternalPackages: [
  'winston',
  '@opentelemetry/sdk-metrics',
  '@opentelemetry/exporter-metrics-otlp-http',
  // ... as needed
],
```

### Route label safety

Use `@podverse/extension-sdk` path normalizer:

- `/podcast/abc-uuid/episodes` → `/podcast/:id/episodes`
- Unknown dynamic → `unmatched` or segment pattern bucket

---

## 3. Management-web (`apps/management-web`)

Mirror web changes (server-instrumentation primary):

- `instrumentation.ts` / middleware
- [infra/k8s/base/management-web/deployment.yaml](infra/k8s/base/management-web/deployment.yaml)
- `EXT_OTEL_SERVICE_NAME=podverse-management-web`

---

## 4. Runtime-config sidecars

**No changes** to prometheus in [apps/web/sidecar/src/server.ts](apps/web/sidecar/src/server.ts) beyond optional shared `envFrom` for extensions ConfigMap (main container needs OTEL vars; sidecar does not).

---

## 5. K8s

- `envFrom: podverse-extensions-config` on **web** and **management-web** main containers
- Add extension-prometheus container via component (plan 04)
- Scrape targets for operators:
  - Next: `pod:3002` — **no** scrape (OTLP only)
  - Extension: `pod:9464` `/extensions/prometheus/metrics`

Clarify in docs: HTTP request metrics appear on extension scrape output, not Next port.

---

## 6. Dependencies

| Package | prom-client | extension-sdk |
| ------- | ----------- | --------------- |
| apps/web | No | Yes |
| apps/management-web | No | Yes |
| apps/web/sidecar | No | No |

---

## 7. E2E impact

E2E typically targets app ports 4032/4132 — extensions off in test env by default.  
No E2E change required unless adding extension smoke spec (optional in plan 09).

---

## 8. Verification

```bash
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
# Local with compose profile (plan 08):
curl -s http://127.0.0.1:9464/extensions/prometheus/metrics | rg podverse_web
```

---

## 9. Acceptance checklist

- [ ] Server instrumentation records HTTP metrics when enabled
- [ ] Disabled: no OTLP exporter startup and minimal instrumentation overhead
- [ ] runtime-config sidecar unchanged functionally
- [ ] K8s pod has 3 containers when extensions on
- [ ] management-web parity complete
