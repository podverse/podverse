# Phase 04 - web CSP propagation

Implement real CSP propagation so extension CSP directives affect browser responses.

## Problem

- Sidecar computes/emits CSP header.
- Web runtime-config fetch currently consumes JSON only and does not propagate CSP to page responses.

## Required changes

- Extend runtime-config fetch path in apps/web/src/config/runtime-config.server.ts to capture CSP header value from sidecar response.
- Introduce a safe transport shape for runtime-config plus optional CSP metadata.
- Wire CSP into Next.js response path in a way that actually affects browser responses.
  - Preferred: middleware or header configuration that reads computed CSP value and merges with existing directives.
  - Preserve existing policy behavior when extensions are disabled.
- Add focused tests for CSP merge behavior:
  - Extensions disabled: no extension CSP addition.
  - Extensions enabled with Cloudflare manifest: script-src includes static.cloudflareinsights.com once.

## Validation

Run:

```bash
./scripts/nix/with-env npm run test -w apps/web
./scripts/nix/with-env npm run build -w apps/web
make e2e_test_web_report_spec SPEC=e2e/extensions-cloudflare-head.spec.ts
```

## Exit criteria

- Extension CSP is enforced in browser-facing response headers.
- No duplicate or conflicting script-src entries.
- Existing page rendering and head script assertions still pass.
