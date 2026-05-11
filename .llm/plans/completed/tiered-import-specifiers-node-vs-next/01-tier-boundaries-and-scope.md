# Tier boundaries and scope (Podverse)

## Tier A — NodeNext `.js` specifiers (enforce)

Applies to TypeScript sources under:

| Path pattern | Notes |
| ------------ | ----- |
| `packages/**/*.ts`, `packages/**/*.tsx` **except** `packages/ui/**` | Published/workspace packages (`packages/ui` is **Tier C**) |
| `apps/api/**/*.ts`, `apps/api/**/*.tsx` | Express API |
| `apps/management-api/**/*.ts`, `apps/management-api/**/*.tsx` | Management API |
| `apps/workers/**/*.ts`, `apps/workers/**/*.tsx` | Workers |
| `apps/web/sidecar/**/*.ts`, `apps/web/sidecar/**/*.tsx` | Web runtime-config sidecar |
| `apps/management-web/sidecar/**/*.ts`, `apps/management-web/sidecar/**/*.tsx` | Management sidecar |
| `tools/**/*.ts`, `tools/**/*.tsx`, `tools/**/*.mts` | Repo tooling |
| `scripts/**/*.ts`, `scripts/**/*.mts` (if linted by root ESLint) | Match actual eslint `files` globs |

**Imports from `node_modules`** stay package-manager style (no `.js` suffix on bare specifiers).

## Tier B — Next.js app bundles (do not enforce `.js` on relatives)

| Path pattern | Notes |
| ------------ | ----- |
| `apps/web/src/**/*.ts`, `apps/web/src/**/*.tsx` | Next.js web |
| `apps/management-web/src/**/*.ts`, `apps/management-web/src/**/*.tsx` | Next.js management-web |
| `apps/web/e2e/**/*.ts` | Playwright; align with web Tier B |
| `apps/management-web/e2e/**/*.ts` | Playwright; align with management-web Tier B |

## Tier C — `packages/ui` (extensionless relatives; ESLint rule off)

| Path pattern | Notes |
| ------------ | ----- |
| `packages/ui/**/*.ts`, `packages/ui/**/*.tsx` | Shared UI transpiled by Next consumers; same relative style as Tier B — **no** `.js` suffix on relatives |

## Excluded from extension rules

- `**/node_modules/**`, `**/dist/**`, `**/.next/**`, `**/compiled/**`
- Generated or vendored trees covered by ESLint `ignores`

## Workspace list (Tier A packages)

All under `packages/`:

`external-services-firebase`, `external-services-object-storage`, `external-services-podcast-index`,
`external-services-paypal`, `helpers`, `helpers-backend`, `helpers-browser`, `helpers-config`,
`helpers-requests`, `helpers-validation`, `mq`, `notifications`, `orm`, `parser`, `parser-mapping`,
`v4v-btc-ln`, `v4v-helpers`, `v4v-metaboost`, `worker-commands`.

**Tier C package:** `ui` (`packages/ui`).

Tier A apps: `api`, `management-api`, `workers`, `web/sidecar`, `management-web/sidecar`.

Tier B apps (src only): `web`, `management-web`.
