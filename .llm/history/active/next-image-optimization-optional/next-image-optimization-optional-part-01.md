# Optional Next.js Image Optimization — LLM history

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Deferred implementation plan saved under `.llm/plans/active/next-image-optimization-optional/`.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

create and save plan files for it locally so i can defer work

#### Key Decisions

- Plan set mirrors prior architectural intent: optional **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`**,
  default optimization **off** via runtime defaults + **`unoptimized`** on **`next/image`** in shared UI.
- Split into three numbered phases: config/plumbing, shared UI, about/sidecar/infra/docs/tests.

#### Files Created

- `.llm/plans/active/next-image-optimization-optional/00-SUMMARY.md`
- `.llm/plans/active/next-image-optimization-optional/00-EXECUTION-ORDER.md`
- `.llm/plans/active/next-image-optimization-optional/COPY-PASTA.md`
- `.llm/plans/active/next-image-optimization-optional/01-runtime-config-and-web-plumbing.md`
- `.llm/plans/active/next-image-optimization-optional/02-shared-ui-next-image-unoptimized.md`
- `.llm/plans/active/next-image-optimization-optional/03-about-sidecar-infra-docs-tests.md`

---

### Session 2 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/next-image-optimization-optional/COPY-PASTA.md:14-15

#### Key Decisions

- Added **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`** to web runtime config (optional); runtime store
  defaults unset/empty to **`'false'`**, matching **`NEXT_PUBLIC_IMAGE_PROXY_ENABLED`**.
- **`getConfig().public.nextImageOptimization.enabled`** is **`true`** only when env is exactly **`true`**.
- Extended **`ImageRuntimeValue`** / **`ImageRuntimeProvider`** with **`nextImageOptimizationEnabled`** so
  **`Providers.tsx`** can pass config (phase 02 will wire **`unoptimized`** on **`next/image`**).
- Archived **`01-runtime-config-and-web-plumbing.md`** to **`.llm/plans/completed/next-image-optimization-optional/`**.

#### Files Created/Modified

- `apps/web/src/config/runtime-config.ts`
- `apps/web/src/config/runtime-config-store.ts`
- `apps/web/src/config/index.ts`
- `apps/web/src/providers/Providers.tsx`
- `packages/ui/src/components/image/ImageRuntime/ImageRuntime.tsx`
- `packages/ui/src/components/image/Image/Image.test.tsx`
- `packages/ui/src/components/image/ImageRuntime/ImageRuntime.test.tsx`
- `packages/ui/src/components/layout/FooterLayout/FooterBrand.test.tsx`
- `.llm/plans/active/next-image-optimization-optional/COPY-PASTA.md`
- `.llm/plans/active/next-image-optimization-optional/00-EXECUTION-ORDER.md`
- `.llm/plans/completed/next-image-optimization-optional/01-runtime-config-and-web-plumbing.md` (moved from active)

---

### Session 3 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/next-image-optimization-optional/COPY-PASTA.md:19-20

#### Key Decisions

- **`Image`** passes **`unoptimized={!nextImageOptimizationEnabled}`** on placeholder and main **`NextImage`**
  paths.
- **`ImageNonReact`** uses plain **`<img>`** only — no **`next/image`**; no code change.
- Extended mocks with **`data-unoptimized`** for assertions; added **`Image`** / **`ImageRuntime`** /
  **`FooterBrand`** tests; archived **`02-shared-ui-next-image-unoptimized.md`** to **`completed/`**.

#### Files Created/Modified

- `packages/ui/src/components/image/Image/Image.tsx`
- `packages/ui/src/components/image/Image/Image.test.tsx`
- `packages/ui/src/components/image/ImageRuntime/ImageRuntime.test.tsx`
- `packages/ui/src/components/layout/FooterLayout/FooterBrand.test.tsx`
- `.llm/plans/active/next-image-optimization-optional/COPY-PASTA.md`
- `.llm/plans/active/next-image-optimization-optional/00-EXECUTION-ORDER.md`
- `.llm/plans/completed/next-image-optimization-optional/02-shared-ui-next-image-unoptimized.md` (moved from active)

---

### Session 4 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/next-image-optimization-optional/COPY-PASTA.md:24-25

#### Key Decisions

- About page raw **`next/image`** instances use **`unoptimized`** when **`config.public.nextImageOptimization`**
  is off.
- Sidecar: **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`** in **`optionalKeys`**, validated like image proxy;
  **`getCategory`** maps it under **Proxy**.
- Documented and stubbed env in **`.env.example`**, **`web-sidecar.env`**, **`ENV.md`**, Lighthouse/bundle-analyzer
  parity files; E2E env sets **`false`** explicitly.
- Moved finished plan set to **`.llm/plans/completed/next-image-optimization-optional/`** (merged with phases 01–02).

#### Files Created/Modified

- `apps/web/src/app/about/page.tsx`
- `apps/web/sidecar/src/server.ts`
- `apps/web/sidecar/.env.example`
- `infra/k8s/base/web/source/web-sidecar.env`
- `apps/web/ENV.md`
- `tools/web-perf/bundle-analyzer/src/env-config.ts`
- `tools/web-perf/lighthouse/.env.web.example`
- `apps/web/playwright.e2e-server-env.ts`
- `.llm/plans/completed/next-image-optimization-optional/` (COPY-PASTA, 00-\*, 03 moved from active; checklist updated)
- `packages/ui/src/components/image/ImageRuntime/ImageRuntime.test.tsx` (full-object expect; fixes TS narrowing / `tsc` in third test)

---

### Session 5 - 2026-05-07

#### Prompt (Developer)

make sure NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED is configurable with the env prepare process

#### Key Decisions

- Added **`dev/env-overrides/local/web-image.env.example`** with **`NEXT_PUBLIC_IMAGE_PROXY_ENABLED`** and
  **`NEXT_PUBLIC_NEXT_IMAGE_OPTIMIZATION_ENABLED`** so **`make local_env_prepare`** merges keys into home
  overrides.
- **`scripts/local-env/setup.sh`** applies both vars via **`apply_override`** into web infra + app sidecar env
  files when set in linked **`web-image.env`**.
- Documented **`web-image.env`** in **`docs/development/env/LOCAL-ENV-OVERRIDES.md`**.

#### Files Created/Modified

- `dev/env-overrides/local/web-image.env.example`
- `scripts/local-env/setup.sh`
- `docs/development/env/LOCAL-ENV-OVERRIDES.md`

---

### Session 6 - 2026-05-07

#### Prompt (Developer)

@podverse/apps/web/src/app/about/page.tsx:1-107 convert the about page to use the ui Image component so we don't have to handle unoptimized here again

#### Key Decisions

- Switched About page from **`next/image`** to **`Image`** from **`@podverse/ui`**; **`unoptimized`** comes from
  **`ImageRuntimeProvider`** via **`useImageRuntime`** inside the shared component.
- **`skipProxy`** on each badge: static **`/images/...`** assets match **`NavBarBrand`** pattern (same-origin, no
  **`/api/proxy`** rewrite).
- Dropped **`aria-hidden`** on **`Image`** (not on **`ImageProps`**); parent anchors keep **`aria-label`**.

#### Files Created/Modified

- `apps/web/src/app/about/page.tsx`
