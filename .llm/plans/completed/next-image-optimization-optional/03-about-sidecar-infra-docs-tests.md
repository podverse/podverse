# Phase 03 — About page, sidecar, infra, docs, E2E env

## Tasks

1. **`apps/web/src/app/about/page.tsx`**
   - Only direct **`import Image from 'next/image'`** in web app.
   - **`getConfig()`** already used — add **`unoptimized={!config.public.nextImageOptimization.enabled}`**
     (or destructure once) on **each** **`Image`** instance.

2. **`apps/web/sidecar/src/server.ts`**
   - Add **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`** to **`optionalKeys`**.
   - **`validateOne`**: mirror **`NEXT_PUBLIC_IMAGE_PROXY_ENABLED`** (blank → valid optional, message like
     “Use Default (disabled)”).
   - Update category/status HTML map keys if this file maintains a table.

3. **`apps/web/sidecar/.env.example`**
   - Document new var near **`NEXT_PUBLIC_IMAGE_PROXY_ENABLED`** — clarify **optimizer** vs **proxy**.

4. **`infra/k8s/base/web/source/web-sidecar.env`**
   - Add stub **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED=`** aligned with other **`NEXT_PUBLIC_*`**
     lines.

5. **`apps/web/ENV.md`**
   - Document optional flag, default **optimization off**, relation to proxy.

6. **Optional parity**
   - [`tools/web-perf/lighthouse/.env.web.example`](../../../../tools/web-perf/lighthouse/.env.web.example),
     [`tools/web-perf/bundle-analyzer/src/env-config.ts`](../../../../tools/web-perf/bundle-analyzer/src/env-config.ts)
     if they list **`NEXT_PUBLIC_IMAGE_PROXY_*`**.

7. **`apps/web/playwright.e2e-server-env.ts`**
   - Add explicit **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED=false`** next to image proxy line if E2E
     should match default prod intent.

## LLM history

Same feature folder; session entry.

## K8s reminder

After changing **`infra/k8s/`**, push to the GitOps-tracked branch so clusters can sync.

## Verification

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages && ./scripts/nix/with-env npm run build -w apps/web
```

Optional smoke E2E (not required unless reviewers want artwork regression):

```bash
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts
```
