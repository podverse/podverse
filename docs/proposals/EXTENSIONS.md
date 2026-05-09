# Conditional Extensions System

Status: Proposed

## Summary

An opt-in extensions framework that lets operators of a Podverse deployment enable
third-party integrations (analytics, observability, webhooks, and similar) without
modifying core code. Each extension is a self-contained workspace package with a
typed manifest and one or more host hooks (web client, api server, management-web admin
UI). Configuration resolves from environment variables (bootstrap defaults) and a new
`extension_settings` row in the app database (runtime override editable from
management-web). The whole system is gated by a master switch `EXTENSIONS_ENABLED` that
defaults to `false`, so extensions are inert until an operator explicitly opts in.

The first concrete extension is Cloudflare Web Analytics; the architecture is shaped to
fit that need plus the next several integrations of the same shape (Datadog APM, Sentry,
outbound webhooks, etc.).

## 1. Motivation

Several near-term operational needs share the same shape:

- Optional, per-deployment.
- Sometimes runtime-editable (token rotation, on/off toggle) without a redeploy.
- Sometimes secret, sometimes intentionally public.
- Sometimes UI-injecting (analytics scripts), sometimes server-side
  (observability middleware), sometimes both.

A per-feature environment variable plus a hand-coded layout block is technically
sufficient for any single such integration, but it does not scale. By the third
integration of the same shape there are three different env vars, three different
injection points, three different operator stories, and no consistent way to flip any of
them on or off without a redeploy.

A generic extensions contract amortizes the cost across all such integrations, keeps
third-party concerns at the edge of the system rather than baked into core paths, and
gives operators a single place to enable, configure, and audit them.

The OSS monorepo is the intended home for the framework and for first-party
integrations: shipping the _option_ to enable a third-party integration is independent
of any specific deployment's choice to use it.

## 2. Goals & non-goals

**Goals**

- Opt-in: master switch defaults to off; per-extension toggles default to off.
- Bootstrap from env vars; override from a database row that management-web can edit.
- Multi-surface: one contract covers web client (script injection, providers), api
  server (middleware, event handlers), and management-web admin UI (list, edit).
- Per-extension typed configuration schema with `secret`, `userEditable`,
  `labelKey`, and optional `helpKey` metadata.
- Clean licensing/ethos boundary: an extension is a self-contained directory with a
  stable workspace package name, so a future extraction to a sibling repo is
  mechanical.
- Extensions cannot import from `apps/*` or other internal packages — they only see
  the SDK and shared UI.

**Non-goals (v1)**

- Hot-loading new extensions without a redeploy.
- Sandboxing untrusted extension code — extension authors are first-party.
- Marketplace or discovery UI.
- Per-account or per-tenant scoping (the contract should not foreclose this, but it
  is out of v1 scope).
- Extensions that own database schema beyond their `extension_settings` row.

## 3. High-level architecture

Three layers, all in the monorepo:

1. **Extension SDK** — a new workspace package `packages/extensions-sdk` that exposes
   nothing but types and contracts: `ExtensionManifest`, `WebClientHook`,
   `ApiServerHook`, `ManagementHook`, `ScriptDescriptor`, `ExtensionConfigSchema`. It is
   publishable so future external repos can build against it if extensions ever move.
1. **Extension registry** — small per-app modules at
   `apps/web/src/lib/extensions/registry.ts`, `apps/api/src/lib/extensions/registry.ts`,
   and `apps/management-web/src/lib/extensions/registry.ts` that statically import each
   extension's manifest. Adding, removing, or relocating an extension is a one-line
   change here.
1. **Extension modules** — a new top-level `extensions/<id>/` folder. Each extension is
   a self-contained workspace package (`@podverse/extension-<id>`) containing
   `manifest.ts` and one or more of `web-client.ts`, `web-client.tsx`, `api-server.ts`,
   `mgmt.ts`, or `mgmt.tsx`, plus a `README.md` and `LICENSE`.

Each app's registry **statically imports** every known extension manifest. Disabled
extensions therefore remain in the client/server bundles (tree-shaking cannot drop a
registry reference). That trade-off is deliberate for first-party-scale catalogs; if the
extension count grows large enough to matter, revisit lazy-loading or optional builds.

```mermaid
flowchart LR
  SDK["@podverse/extensions-sdk<br/>(types + contracts)"]
  ExtA["@podverse/extension-cloudflare-web-analytics"]
  ExtB["@podverse/extension-future-x"]
  RegW["apps/web registry"]
  RegA["apps/api registry"]
  RegM["apps/management-web registry"]
  WebHost["apps/web RootLayout"]
  ApiHost["apps/api startup"]
  MgmtHost["apps/management-web /extensions"]
  DB[("app DB:<br/>extension_settings")]

  SDK --> ExtA
  SDK --> ExtB
  ExtA --> RegW
  ExtA --> RegM
  ExtB --> RegW
  ExtB --> RegA
  ExtB --> RegM
  RegW --> WebHost
  RegA --> ApiHost
  RegM --> MgmtHost
  DB --> WebHost
  DB --> ApiHost
  MgmtHost -- "PUT via management-api" --> DB
```

## 4. Extension contract (the SDK)

`ExtensionManifest`:

- `id` — kebab-case, stable forever (used as DB primary key and env-var prefix).
- `name`, `description`, `kind` — `kind` is one of `analytics`, `observability`,
  `integration`, `webhook`, `other`.
- `defaultEnabled` — TypeScript literal `false` only (not `boolean`). A manifest cannot
  compile if it sets `true`; extensions stay inert until an operator opts in.
- `configSchema` — a Joi schema. Each field is annotated with `secret: boolean`,
  `userEditable: boolean`, and next-intl keys `labelKey` and optional `helpKey` for
  management-web. Human-readable strings live in `apps/management-web/i18n/originals/`
  and overrides — not inside `@podverse/ui`. Secret fields are stripped at the SSR
  boundary and masked in management-web forms. Non-user-editable fields can only be set
  via env.
- `requires` — optional `{ web?: WebClientHook; api?: ApiServerHook; mgmt?: ManagementHook }`.
  An extension declares only the hooks it needs.
- `cspSources?` — optional list of CSP source declarations the runtime-config sidecar
  should merge into the `Content-Security-Policy` header when this extension is active.

Hook surfaces (each optional):

- **`WebClientHook`** — `headScripts(ctx) => ScriptDescriptor[]`,
  `bodyProviders(ctx) => ReactNode[]`. Rendered by `apps/web/src/app/layout.tsx` just
  inside `<head>` (after `RuntimeConfigScript`) and around `<Providers>`.
- **`ApiServerHook`** — `registerMiddleware(app)`, `registerEventHandlers(bus)`. Called
  once at api startup, after env validation and ORM init.
- **`ManagementHook`** — `navSection: { label, icon, href }`, optional
  `SettingsForm: React.FC<{ config; onSave }>`. When `SettingsForm` is omitted, the host
  auto-generates a form by reflecting on `configSchema` with Joi **in the
  management-web client**. Joi ships for the `/extensions` routes only; bundle impact is
  acceptable on a low-traffic admin surface.

The SDK is types only; it has no runtime code. Resolution and rendering live in the
host apps so each app can wire the contract into its own layout, routing, and i18n
without forcing those concerns into the SDK.

## 5. Configuration resolution order

```mermaid
flowchart TD
  Start([Resolve extension X]) --> M{EXTENSIONS_ENABLED=true?}
  M -- no --> Off1([inert])
  M -- yes --> R{DB row exists for X?}
  R -- yes --> Use1([use DB.enabled + DB.config; env ignored])
  R -- no --> E{EXTENSION_X_ENABLED=true?}
  E -- no --> Off2([inert])
  E -- yes --> Use2([use env-derived config])
```

- `EXTENSIONS_ENABLED` (default `false`) gates the entire system. If unset or `false`,
  every extension is inert regardless of DB state or per-extension env.
- Per-extension `EXTENSION_<ID>_ENABLED=true` and `EXTENSION_<ID>_<KEY>=...` env vars
  provide bootstrap defaults. `<ID>` is the manifest's `id` upper-cased with kebab-case
  hyphens converted to underscores.
- **Override semantics:** once any row exists in `extension_settings` for an extension,
  that row fully replaces env-derived config for that extension — env keys for that
  extension are ignored. Operators who rely on env-only mode simply never insert a row.
- DB row absence does not mean disabled — it means "fall back to env." This preserves
  the env-only deployment mode for operators who prefer never to touch the
  management-web UI.

This ordering matches operator expectations: env is the deployment-time default,
management-web persists the authoritative runtime row when used, and there is always a
way to disable everything centrally.

## 6. Storage model

A new linear migration adds a single table to the **app DB** (not the management DB)
because both `apps/web` and `apps/api` need to read it on render and request paths.

Filename below is illustrative — the numeric prefix is assigned at implementation time
per [linear-sql-greenfield-only](../../.cursor/skills/linear-sql-greenfield-only/SKILL.md).

`infra/k8s/base/ops/source/database/linear-migrations/app/NNNN_extension_settings.sql`:

```sql
CREATE TABLE extension_settings (
  id varchar(120) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by_admin_id integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- `id` is the manifest `id`. Stability of the value is therefore a hard contract on
  manifests.
- `updated_by_admin_id` stores `admin_account.id` from the management DB (integer PK)
  when known; informational only — no foreign key because admins live in the management
  DB and the column documents intent without coupling schemas.
- `config` is `jsonb`; the application validates against the manifest's `configSchema`
  before write.

A new ORM service `packages/orm/src/services/ExtensionSettingsService.ts` wraps reads
and writes and integrates with the existing service patterns. Reads are cached in Valkey
under `extension:<id>` keys with a **long TTL** (e.g. 5 minutes) as a safety net for cold
replicas. On every successful write, management-api **`PUBLISH`es**
`extension:invalidated:<id>` on Valkey; every `apps/web` and `apps/api` process
**`SUBSCRIBE`s** to that channel and drops in-process and Valkey entries so config
changes propagate across replicas within ~1 second without waiting for TTL expiry.

## 7. Surface 1 — apps/web client

The driving use case: inject a script tag (Cloudflare beacon, etc.) into the
server-rendered HTML when an extension is active.

- `apps/web/src/lib/extensions/resolveExtensions.ts` returns the active extensions and
  their resolved configs per the resolution order above (env bootstrap or full DB
  override).
- `apps/web/src/app/layout.tsx` renders `<ExtensionHeadScripts />` inside `<head>` and
  wraps children in `<ExtensionProviders>`. Both are no-ops when the master switch is
  off.
- Sensitive config never reaches the client. Any field annotated `secret: true` is
  stripped at the SSR boundary; the resolved config that goes to client components
  contains only the non-secret subset.
- CSP integration: when `EXTENSIONS_ENABLED` is `false`, **no** extension `cspSources`
  are merged — operators must not inherit third-party CSP allowances while the framework
  is off. When extensions are enabled and active, each extension's `cspSources` are
  merged into the `Content-Security-Policy` header by the web sidecar so that script
  injection does not require operators to hand-edit policy. Extensions that fail to
  declare needed sources break loudly in dev and staging rather than silently in
  production.

## 8. Surface 2 — apps/api server

**Rollout:** Bootstrap and the api event bus are **Phase 2** per §13 — Phase 1 ships the
web client, management-web admin UI, and `extension_settings` persistence. This section
documents the api contract shared via `packages/extensions-sdk`.

- `apps/api/src/lib/extensions/bootstrap.ts` runs after env validation and ORM init,
  iterates active extensions, and calls `registerMiddleware(app)` and
  `registerEventHandlers(bus)`.
- A small in-process event bus emits typed domain events raised inside **apps/api** — once
  Phase 2 ships, examples include `account.created`, `http.request.completed`.
  Extensions subscribe; they cannot mutate events or block the request path. Errors thrown
  by an extension's event handler are logged and swallowed so a misbehaving extension
  cannot brick the api. Workers-emitted events (e.g. boosts, feed parses) are **not** on
  this bus until the workers→api bridge lands (Phase 2) alongside worker hooks.
- Workers are intentionally **out of scope for v1**. A worker hook surface is a natural
  Phase 2 addition once the api side is exercised by a real observability extension.

## 9. Surface 3 — apps/management-web admin UI

- A new nav section `extensions` is added to
  `apps/management-web/src/lib/managementNavRoutes.ts`, gated by `EXTENSIONS_ENABLED`
  and authorization: **superusers always** have access; any **non-superuser admin**
  needs the new **`extensions_crud`** permission grant (no separate read/write split in
  v1).
- List page (`/extensions`): one row per known extension manifest, with enabled toggle
  and "last updated" timestamp.
- Detail page (`/extensions/[id]`): renders the extension's `SettingsForm`, or the
  auto-generated Joi-backed form from `configSchema` when no custom form is provided.
  Save POSTs to a new management-api route `PUT /extensions/:id`, which writes to the app
  DB via the existing cross-DB pattern that management-api already uses for app-DB
  mutations, then **`PUBLISH`es** `extension:invalidated:<id>` so all replicas drop
  cached state immediately.
- Follows existing patterns: `@podverse/ui` resource table,
  [`form-primary-actions-row`](../../.cursor/skills/form-primary-actions-row/SKILL.md),
  [`crud-tables-resources`](../../.cursor/skills/crud-tables-resources/SKILL.md),
  [`modal-layout-contract`](../../.cursor/skills/modal-layout-contract/SKILL.md) for
  any confirms.

```mermaid
sequenceDiagram
  participant Admin
  participant MgmtWeb as management-web
  participant MgmtApi as management-api
  participant AppDB as app DB
  participant Web as apps/web SSR
  participant Cache as Valkey

  Admin->>MgmtWeb: edit extension config, Save
  MgmtWeb->>MgmtApi: PUT /extensions/:id
  MgmtApi->>AppDB: UPSERT extension_settings
  MgmtApi->>Cache: PUBLISH extension:invalidated:id
  MgmtApi-->>MgmtWeb: 200
  Note over Web,Cache: subscribers drop cache within ~1s
  Note over Web,Cache: next request
  Web->>Cache: GET extension:id
  Cache-->>Web: miss or stale after invalidate
  Web->>AppDB: SELECT extension_settings WHERE id=:id
  AppDB-->>Web: row
  Web->>Cache: SET extension:id ttl=5m
```

## 10. First concrete extension — Cloudflare Web Analytics

`extensions/cloudflare-web-analytics/`:

- `manifest.ts` — `id: 'cloudflare-web-analytics'`, `kind: 'analytics'`,
  `configSchema` fields include `labelKey` / `helpKey` (e.g.
  `extensions.cloudflare.token.label`) alongside `token: string` (required,
  `secret: false`, `userEditable: true`) and optional `beaconUrl`. The token is
  intentionally public — it is a beacon identifier, not a credential — and the help text
  should say so.
- `web-client.ts` — `headScripts({ config })` returns a script descriptor with
  `src: 'https://static.cloudflareinsights.com/beacon.min.js'`, `defer: true`, and
  `dataAttrs` for `'cf-beacon'` set to `JSON.stringify({ token: config.token })`.
- `mgmt.tsx` — minimal; relies on the auto-form for v1.
- `cspSources` — adds the Cloudflare Insights script source.
- `README.md` — env keys (`EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED`,
  `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN`), management-web override path, and a
  one-paragraph description of what data Cloudflare collects.

## 11. Boundary discipline

The architecture treats the OSS monorepo as the _default and intended_ home for
extensions. To keep a future extraction (e.g. a separate `podverse-extensions` repo)
cheap if it is ever wanted, every extension follows these rules:

- Imports only from `@podverse/extensions-sdk`, `@podverse/ui`, and framework types
  (`react`, `next`). No imports from `apps/*` or other internal packages.
- Each `extensions/<id>/package.json` declares a stable workspace package name
  (`@podverse/extension-<id>`); the host registry imports manifests by package name, so
  today's monorepo path matches a hypothetical published path.
- Per-extension `LICENSE` file, so a mixed-license extraction is mechanical.

This is hygiene, not a roadmap commitment. The default is "keep extensions in this
repo."

## 12. Risks & open questions

- **CSP / SRI:** every script-injecting extension must declare its sources and (where
  feasible) integrity hashes. CSP merging in the sidecar is straightforward; SRI is
  trickier because Cloudflare does not publish a stable hash for `beacon.min.js`. The
  Cloudflare extension declares the source but no hash; future extensions may declare
  hashes when their providers expose them.
- **Audit trail:** is `updated_by_admin_id` plus `updated_at` enough, or do we want a
  dedicated `extension_settings_history` table? Deferred to Phase 3 unless v1 audit
  proves insufficient.
- **Per-account scoping:** out of v1, but the schema may want a reserved hook (e.g. a
  nullable `account_id` added in a later migration) so the path is clear.
- **Test coverage:** Playwright spec for management-web `/extensions` list and edit; an
  apps/web HEAD assertion that the beacon script is present iff the extension is
  active; integration test for the cross-DB write; unit tests for the config resolver
  covering every branch of section 5's flowchart.
- **Vendoring policy:** when an extension wraps a third-party SDK, do we vendor the
  SDK or pull from npm? Cloudflare's beacon is a remote `<script>` so the question is
  moot for v1 but will arise for, say, a Datadog APM extension.

## 13. Phased rollout

- **Phase 1:** SDK + registry + master env switch + `extension_settings` table +
  Cloudflare Web Analytics extension (web surface only) + management-web list and edit
  UI + integration and E2E tests. Implementation follows the numbered plan set under
  `.llm/plans/active/extensions-framework/` once this proposal is accepted.
- **Phase 2:** apps/api hook surface + event bus + first observability-style extension
  (Datadog APM is a candidate; it validates the secret-config path that Cloudflare
  does not exercise).
- **Phase 3:** per-account scoping if and when a use case appears; audit-history table
  if v1 audit proves insufficient; optional extraction to a separate repo if ever
  desired.

## 14. Decisions (resolved)

These decisions close prior gaps and define Phase 1 behavior:

1. **Master switch.** `EXTENSIONS_ENABLED=false` by default in every environment.
2. **Permissions.** Superusers always access `/extensions`; grant **`extensions_crud`**
   to non-superuser admins who may configure extensions (single permission in v1 — no
   separate read/write split).
3. **Caching.** Valkey stores `extension:<id>` with a **long TTL** (e.g. 5 minutes) as a
   safety net. On every write, management-api **`PUBLISH`es**
   `extension:invalidated:<id>`; every `apps/web` and `apps/api` replica **`SUBSCRIBE`s**
   and drops cached entries so changes propagate within ~1 second.
4. **Phase 1 scope.** Web surface + management-web admin UI + app DB + tests; defer the
   apps/api hook surface and full event-bus wiring for observability extensions to Phase 2.
5. **Config resolution.** **Override:** once a row exists in `extension_settings` for an
   extension, env-derived values for that extension are ignored entirely.
6. **Auto-generated SettingsForm.** Reflect **`configSchema`** using **Joi in the
   management-web client** for `/extensions` routes only (acceptable bundle cost on a
   low-traffic admin surface).
7. **i18n.** Each schema field carries **`labelKey`** and optional **`helpKey`**;
   localized strings ship in **`apps/management-web/i18n/`** bundles per existing
   patterns.
8. **Api event bus.** Events are **api-emitted only** (no workers bridge in Phase 1);
   workers→api republishing lands in Phase 2 with api bootstrap (§8).
9. **`defaultEnabled`.** TypeScript literal **`false`** on every manifest — not a
   general `boolean`.

When reviewers accept this proposal, update the header to **`Status: Accepted`** and
execute Phase 1 via `.llm/plans/active/extensions-framework/`. Any parallel Cloudflare
env rollout plan under `.llm/plans/active/` should document convergence with the same end
state.
