# Phase 05 — management-api extensions routes

Add the read and write endpoints that back the management-web `/extensions` UI from
phase `06`. All writes flow through these routes; the apps/web SSR path only reads.

## Routes

`apps/management-api/src/routes/extensions.ts` (mount-style per the pattern set in
`apps/management-api/src/routes/admins.ts`):

- `GET /extensions` — returns the union of registered manifests and any DB rows.
  Each entry has `id`, `name`, `description`, `kind`, `enabled` (DB row or env-derived
  default), `updatedAt`, `updatedByAdminId`.
- `GET /extensions/:id` — returns the single extension's manifest summary, current
  resolved state, and current DB-stored config (or `null` if no row).
- `PUT /extensions/:id` — body is `{ enabled: boolean, config: object }`. Validates
  `config` against the manifest's `configSchema.joi` server-side. Upserts via the
  ORM service from phase `02`. Invalidates the Valkey cache key. Returns the saved
  row.

The router is mounted at `${config.api.prefix}${config.api.version}/extensions` per
the [`management-api`](../../../../.cursor/skills/management-api/SKILL.md) skill.

## Permission

Add a new `extensions_crud` permission to the management permissions schema. The
v1 default is "superuser only" but the column exists so a future role can grant it.

- `apps/management-api/src/lib/auth/`: add the permission to the union type and
  default-deny list.
- `apps/management-api/src/orm/services/`: ensure existing permission services include
  the new field.
- Migration on the management DB if the management permissions schema is enumerated
  there; otherwise the change is type-only. Follow whichever pattern the existing
  permissions (e.g. `admins_crud`, `feeds_crud`) use.

## Cross-DB write

Management-api writes to the **app DB** (where `extension_settings` lives). Use the
same cross-DB pattern that management-api already employs for app-DB mutations
(reference: existing app-DB writes from management-api routes; see
`apps/management-api/src/orm/services/` for the connection convention).

The write path:

1. Resolve current admin via the management-api auth middleware.
1. Authorize via `extensions_crud` permission.
1. Look up the manifest in the registry for `:id`. If unknown, 404.
1. Validate `config` against `manifest.configSchema.joi` (`stripUnknown: true`). If
   invalid, 400 with the Joi error.
1. `ExtensionSettingsService.upsert(...)` with `updatedByAdminId` set to the current
   admin's id.
1. `invalidateCachedExtensionSetting(...)`.
1. Return the saved row in the response shape.

## Joi schemas (request validation)

Per [`management-api`](../../../../.cursor/skills/management-api/SKILL.md), validation
schemas live in `apps/management-api/src/schemas/`:

- `apps/management-api/src/schemas/extensions.ts` exports
  `extensionPutBodySchema` and the request type. The body schema validates
  `enabled: boolean` and `config: object`; per-manifest config validation happens in
  the route handler against the manifest schema.

## Integration tests

`apps/management-api/src/routes/extensions.integration.test.ts` mirrors the structure
of `apps/management-api/src/routes/feeds.integration.test.ts`:

- Setup: superuser fixture + non-permission admin fixture + register a fake
  in-test extension (`id: 'test-extension'`) in a test-only registry.
- `GET /extensions` returns the registered manifest with default state and no
  `updatedAt`.
- `GET /extensions/:id` for unknown id returns 404.
- `PUT /extensions/:id` without `extensions_crud` returns 403.
- `PUT /extensions/:id` with valid body persists, returns 200 with the saved row,
  and `GET /extensions/:id` reflects the change.
- `PUT /extensions/:id` with invalid `config` against the manifest schema returns
  400.
- After a successful `PUT`, the corresponding Valkey key is invalidated (assert via a
  spy or by reading the key directly through the test client).

The fake test extension keeps the test isolated from the real Cloudflare extension
that lands in phase `07`.

## Auth and PII

Per the [`api-no-pii-credentials`](../../../../.cursor/rules/api-no-pii-credentials-in-responses.mdc)
rule (the management-api equivalent), the response body for `GET /extensions/:id`
must not include any field marked `secret: true` from the manifest's `configSchema`.
The auto-form in phase `06` shows masked input for secret fields.

## Verification

```bash
./scripts/nix/with-env make test_deps
./scripts/nix/with-env npm run test:e2e:api
./scripts/nix/with-env npm run lint
```

`npm run test:e2e:api` runs both apps/api and apps/management-api integration suites
against the test databases; the new `routes/extensions.integration.test.ts` is the
gating signal here.
