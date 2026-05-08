# 04 - NavBar Brand Convergence Spike

## Assessment

Management-web already uses the shared `@podverse/ui` `NavBar`:

- `apps/management-web/src/components/ManagementAppLayout/ManagementAppLayout.tsx`
- `packages/ui/src/components/navigation/NavBar/NavBar.tsx`

Web uses a fully app-local nav:

- `apps/web/src/components/NavBar/NavBar.tsx`
- `apps/web/src/components/NavBar/NavBarBrand.tsx`
- `apps/web/src/styles/components/NavBar/NavBar.module.scss`
- `apps/web/src/styles/components/NavBar/NavBarBrand.module.scss`

Full web NavBar migration is likely too broad because web nav owns product-specific search, side-nav, profile, and responsive behavior. A narrower brand/shell spike is still worth doing because the shared `NavBar` currently reflects management styling more than the web baseline.

## Prompt

Run a narrow nav brand/shell convergence spike, then implement only if low risk.

1. Compare nav shells:
   - Management `NavBar` slot layout and brand text link.
   - Web `NavBar` height, backgrounds, mobile behavior, brand logo link.
2. Decide the narrowest reusable primitive:
   - Option A: Extend `@podverse/ui` `NavBar` with `appearance="web" | "management"` and slot classes.
   - Option B: Add `NavBrandLink` with text and logo modes, leaving full nav shells app-local.
   - Option C: Document no implementation if the overlap is too visual/product-specific.
3. If implementing:
   - Prefer web’s existing visual baseline for any shared style conflict.
   - Migrate management brand link first; migrate web brand/shell only if it does not disturb search/profile/side-nav behavior.
   - Avoid importing app config or Next-specific image/link behavior into `@podverse/ui`; use `LinkComponent`/render props.
4. Tests:
   - Add `@podverse/ui` tests for brand/link rendering if a new shared component is added.
   - Add/update E2E only if navigation behavior changes.

## Acceptance Criteria

- The spike records whether a shared nav brand/shell primitive is worth implementing.
- If implemented, app-specific nav behavior remains app-local and only generic shell/brand UI moves into `@podverse/ui`.
- If not implemented, leave a short note in this plan or follow-up docs explaining why.

## Spike outcome

**Chosen:** Option A — extend `@podverse/ui` `NavBar` with `appearance="management" | "web"`.

**Rationale:** The overlap worth sharing is the outer shell (desktop/mobile heights, padding, background tokens). Brand treatment differs (management text link vs web themed logo + responsive visibility); pulling logo/config into `NavBrandLink` would still leave Next/Image and theme hooks app-local, so a dedicated primitive added little beyond documenting slots.

**Implemented:**

- `appearance="web"` applies SCSS aligned with `apps/web/src/styles/components/NavBar/NavBar.module.scss` (fixed bar height, asymmetric padding, mobile quaternary background).
- Default `appearance="management"` preserves the previous shared bar for any legacy call sites.
- **Management-web** passes `appearance="web"` so its top bar matches the web product chrome baseline; brand remains an app-supplied `<a>` with local `brandLink` typography.
- **Web** keeps its full local `NavBar` composition (search, side-nav, profile, `NavBarBrand` logo rules) unchanged — no navigation behavior change; no new web E2E required.

## Verification

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui -w @podverse/web -w @podverse/management-web
./scripts/nix/with-env npm run type-check -w @podverse/ui -w @podverse/web -w @podverse/management-web
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```
