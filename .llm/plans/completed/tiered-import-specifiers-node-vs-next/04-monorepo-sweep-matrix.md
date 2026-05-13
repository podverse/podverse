# Monorepo sweep matrix (Podverse)

## Rollout status (implementation)

- **Tier A:** Root ESLint local rule `nodeNextRelativeImports/require-relative-js-extension` is **on**; packages (except `packages/ui`) and Node-side apps were swept with targeted `eslint --fix` where needed. Verify with `./scripts/nix/with-env npx eslint` over Tier A globs from repo root if needed.
- **Tier C (`packages/ui`):** Extensionless relatives only; rule **off**. Do not sweep to `.js` — breaks Next bundling of `.tsx` sources.
- **Tier B:** **No** `.js` specifier sweep — Next `src` and colocated `e2e` stay extension-flexible per Turbopack constraints ([vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945)).


## Columns

Use when executing the rollout: **Tier**, **Sweep done**, **Lint clean**, **Notes**.

## Tier A — packages

| Workspace | Tier | Sweep | Lint | Notes |
| --------- | ---- | ----- | ---- | ----- |
| `packages/external-services-firebase` | A | | | |
| `packages/external-services-object-storage` | A | | | |
| `packages/external-services-podcast-index` | A | | | |
| `packages/external-services-paypal` | A | | | |
| `packages/helpers` | A | | | |
| `packages/helpers-backend` | A | | | |
| `packages/helpers-browser` | A | | | |
| `packages/helpers-config` | A | | | |
| `packages/helpers-requests` | A | | | |
| `packages/helpers-validation` | A | | | |
| `packages/mq` | A | | | |
| `packages/notifications` | A | | | |
| `packages/orm` | A | | | |
| `packages/parser` | A | | | |
| `packages/parser-mapping` | A | | | |
| `packages/v4v-btc-ln` | A | | | |
| `packages/v4v-helpers` | A | | | |
| `packages/v4v-metaboost` | A | | | |
| `packages/worker-commands` | A | | | |

## Tier A — apps and sidecars

| Workspace | Tier | Sweep | Lint | Notes |
| --------- | ---- | ----- | ---- | ----- |
| `apps/api` | A | | | |
| `apps/management-api` | A | | | |
| `apps/workers` | A | | | |
| `apps/web/sidecar` | A | | | |
| `apps/management-web/sidecar` | A | | | |

## Tier C — shared UI package

| Workspace / path | Tier | Sweep | Lint | Notes |
| ---------------- | ---- | ----- | ---- | ----- |
| `packages/ui` | C | | | Extensionless relatives; Next `transpilePackages`; same style as Tier B |

## Tier B — Next src + e2e

| Workspace / path | Tier | Sweep | Lint | Notes |
| ---------------- | ---- | ----- | ---- | ----- |
| `apps/web/src` | B | | | Extension-flexible |
| `apps/web/e2e` | B | | | Align with web |
| `apps/management-web/src` | B | | | Extension-flexible |
| `apps/management-web/e2e` | B | | | Align with management-web |

## Codemod strategy

1. `npm run lint:fix` at repo root after ESLint change.
2. Manual fixes: **dynamic import()**, **re-export** lines, non-standard quotes, barrel files.
3. Edge case: `.scss` / `.css` imports — should remain non-TS (rule typically ignores).

## Build verification (Tier B unchanged)

```bash
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env npm run build -w apps/management-web
```

Full regression (optional): `npm test` / Make E2E if touching app behavior.
