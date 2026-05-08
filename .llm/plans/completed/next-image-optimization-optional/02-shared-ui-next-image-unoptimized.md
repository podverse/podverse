# Phase 02 — Shared UI: `unoptimized` from runtime

## Prerequisites

Phase 01 complete: **`ImageRuntimeProvider`** receives **`nextImageOptimizationEnabled`** from web config.

## Tasks

1. **`packages/ui/src/components/image/ImageRuntime/ImageRuntime.tsx`**
   - Extend **`ImageRuntimeValue`** with **`nextImageOptimizationEnabled: boolean`**.
   - Add prop to **`ImageRuntimeProvider`**; include in **`useMemo`** deps.

2. **`packages/ui/src/components/image/Image/Image.tsx`**
   - Read **`nextImageOptimizationEnabled`** from **`useImageRuntime()`**.
   - Pass **`unoptimized={!nextImageOptimizationEnabled}`** to every **`NextImage`** (placeholder and
     main render paths).

3. **`packages/ui/src/components/image/ImageNonReact/ImageNonReact.tsx`**
   - Same **`unoptimized`** wiring if it renders **`next/image`**.

4. **Tests**
   - [**`Image.test.tsx`**](../../../../packages/ui/src/components/image/Image/Image.test.tsx): extend default
     provider props; assert mocked **`next/image`** receives **`unoptimized: true`** when flag false,
     **`unoptimized: false`** when true.
   - [**`ImageRuntime.test.tsx`**](../../../../packages/ui/src/components/image/ImageRuntime/ImageRuntime.test.tsx):
     cover new context field if useful.
   - [**`FooterBrand.test.tsx`**](../../../../packages/ui/src/components/layout/FooterLayout/FooterBrand.test.tsx):
     pass **`nextImageOptimizationEnabled`** on **`ImageRuntimeProvider`** defaults.

5. **Exports**
   - No change needed if only **`ImageRuntimeProvider`** props expand; confirm **`packages/ui`** types
     export if **`ImageRuntimeProviderProps`** is public.

## LLM history

Same feature folder as phase 01; new session entry.

## Verification

```bash
./scripts/nix/with-env npm run test:unit -w @podverse/ui
```

(Or monorepo unit test target that includes `packages/ui`.)
