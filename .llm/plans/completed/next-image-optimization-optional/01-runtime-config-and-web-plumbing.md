# Phase 01 — Runtime config and web app plumbing

## Context

Add **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`**. When unset or not exactly **`true`**, treat Next
image optimization as **disabled** (aligned with current SSRF pain when proxy is off).

Follow the same optional-boolean pattern as **`NEXT_PUBLIC_IMAGE_PROXY_ENABLED`** in
[`apps/web/src/config/runtime-config-store.ts`](../../../../apps/web/src/config/runtime-config-store.ts).

## Tasks

1. **`runtime-config.ts`**
   - Add `NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED` to `WebRuntimeConfigEnvKey`.
   - Append to `webRuntimeConfigEnvKeys.optional`.

2. **`runtime-config-store.ts`**
   - In **`applyWebRuntimeEnvDefaults`**, if unset or empty, set resolved value to **`'false'`** (optimizer
     off by default).

3. **`apps/web/src/config/index.ts`**
   - Under `public`, add e.g. **`nextImageOptimization: { enabled: boolean }`** using
     **`env.NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED === 'true'`** only (defaults come from
     runtime-store normalization).

4. **`apps/web/src/providers/Providers.tsx`**
   - Pass **`nextImageOptimizationEnabled={config.public.nextImageOptimization.enabled}`** into
     **`ImageRuntimeProvider`** (exact prop name must match phase 02 **`ImageRuntimeValue`**).

## LLM history

Append session to `.llm/history/active/next-image-optimization-optional/next-image-optimization-optional-part-01.md`
(or create directory + file) with verbatim prompt, decisions, and files touched.

## Verification

```bash
./scripts/nix/with-env npm run lint -w apps/web --if-present
```

(Or root `npm run lint` if workspace lint includes web.)
