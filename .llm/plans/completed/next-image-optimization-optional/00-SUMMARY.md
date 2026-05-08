# Optional Next.js Image Optimization — summary

## Goal

Make Next.js **Image Optimization** (`/_next/image`) **optional** via an env flag. **Default when unset:**
optimization **off** (`unoptimized` behavior), so remote artwork does not hit the optimizer’s SSRF/DNS
checks (e.g. CGNAT `100.64.0.0/10` failures when image proxy is off).

## Distinction

| Mechanism                         | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_IMAGE_PROXY_ENABLED` | Route remote URLs through `/api/proxy` (same-origin) |
| **New flag**                      | Enable/disable Next **built-in** image optimizer     |

## Key env

- **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`** — optional string; treat **`true`** as enabled,
  everything else (unset, empty, `false`) as **disabled** (default).

## Primary touchpoints

- [`apps/web/src/config/runtime-config.ts`](../../../../apps/web/src/config/runtime-config.ts),
  [`runtime-config-store.ts`](../../../../apps/web/src/config/runtime-config-store.ts),
  [`apps/web/src/config/index.ts`](../../../../apps/web/src/config/index.ts)
- [`packages/ui/src/components/image/ImageRuntime/ImageRuntime.tsx`](../../../../packages/ui/src/components/image/ImageRuntime/ImageRuntime.tsx),
  [`Image/Image.tsx`](../../../../packages/ui/src/components/image/Image/Image.tsx),
  [`ImageNonReact/ImageNonReact.tsx`](../../../../packages/ui/src/components/image/ImageNonReact/ImageNonReact.tsx)
- [`apps/web/src/providers/Providers.tsx`](../../../../apps/web/src/providers/Providers.tsx)
- [`apps/web/src/app/about/page.tsx`](../../../../apps/web/src/app/about/page.tsx) — only raw `next/image`
  usage in web app
- Sidecar: [`apps/web/sidecar/src/server.ts`](../../../../apps/web/sidecar/src/server.ts),
  [`apps/web/sidecar/.env.example`](../../../../apps/web/sidecar/.env.example)
- Infra stub: [`infra/k8s/base/web/source/web-sidecar.env`](../../../../infra/k8s/base/web/source/web-sidecar.env)
- Docs: [`apps/web/ENV.md`](../../../../apps/web/ENV.md)

## Non-goals

- Do **not** rely on `next.config.mjs` `images.unoptimized` alone for runtime toggling (build-time vs
  sidecar mismatch).
- **management-web** has no `ImageRuntimeProvider` today; out of scope unless added later.

## Verification (after implementation)

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages && ./scripts/nix/with-env npm run build -w apps/web
```

## Archive

When all numbered prompts are done, move this directory to
`.llm/plans/completed/next-image-optimization-optional/` per plan lifecycle.
