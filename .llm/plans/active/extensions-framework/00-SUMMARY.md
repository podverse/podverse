# extensions-framework — summary

Implements Phase 1 of the conditional extensions system described in
[docs/proposals/EXTENSIONS.md](../../../../docs/proposals/EXTENSIONS.md): the SDK,
storage and resolver, web/api/management-web host wiring, the first concrete extension
(Cloudflare Web Analytics), a single-emitter consolidation, and verification.

## Scope (Phase 1)

- New workspace package `packages/extensions-sdk` (types only).
- New linear migration `0032_extension_settings.sql` and ORM service.
- Host resolver + Valkey cache.
- `apps/web` host wiring (`<ExtensionHeadScripts />`, providers, CSP merging,
  master-switch and per-extension env keys).
- `apps/management-api` routes `GET /extensions`, `GET /extensions/:id`,
  `PUT /extensions/:id`, with cross-DB write to the app database.
- `apps/management-web` `/extensions` list and detail pages, nav entry, auto-form
  generator, new `extensions_crud` permission.
- New extension `extensions/cloudflare-web-analytics/` registered in web and
  management-web registries.
- Single-emitter consolidation: `<ExtensionHeadScripts />` is the sole path that
  renders the Cloudflare beacon `<script>` tag.
- Verification: integration tests, Playwright E2E, unit tests for the resolver.

## Out of scope (covered by later phases of the proposal)

- `apps/api` hook surface and event bus (proposal Phase 2).
- Per-account scoping (proposal Phase 3).
- Audit-history table (proposal Phase 3).
- Marketplace UI (proposal Phase 3).
- Any extension other than Cloudflare Web Analytics (Phase 2 onward).

## Relationship to the parallel Cloudflare env plan

There is a parallel Cursor parent plan, `cloudflare_web_analytics_env_6f142d3e`, which
is **also currently pre-implementation**. It scopes a smaller, framework-free path:
add `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` to the runtime-config pipeline,
introduce pure helper functions
(`packages/helpers/.../cloudflareWebAnalytics.ts` with
`cloudflareWebAnalytics.test.ts`), and SSR-render a `<script defer>` beacon directly
from each app's root `layout.tsx` when the token is present.

The two plans are **siblings**, not sequential. Neither has shipped. Either ordering
yields the same end state because both share the same target shape:

- **Env path is a permanent deployment mode.** The proposal's resolution order
  (master switch → DB row → env) preserves env-only deployments forever.
- **Helpers are shared once.** Whichever plan ships first owns the pure helpers in
  `packages/helpers`. The other reuses them. The Cloudflare extension's `web-client.ts`
  imports the same helpers; the env plan's root-layout `<script>` (if it ships first)
  imports the same helpers.
- **One emitter of the `<script>` tag.** End state has exactly one path emitting the
  beacon: `<ExtensionHeadScripts />` rendered by the root layout. Step `08` documents
  both branches (env shipped first → consolidate; framework shipped first → no-op).

### Branch A (env plan shipped first)

- Steps `01–07` proceed normally.
- Step `08` removes the env plan's direct `<script>` rendering in
  `apps/web/src/app/layout.tsx` and `apps/management-web/src/app/layout.tsx` and routes
  through `<ExtensionHeadScripts />`. The Cloudflare extension's manifest declares
  `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` as its env-derived bootstrap config so
  the env-only deployment mode keeps working.
- An assertion in step `08` confirms the rendered HTML for an env-only deployment is
  identical before and after the consolidation.

### Branch B (this plan set shipped first or alongside)

- The env plan's layout step is dropped from its scope; its remaining work
  (helpers + runtime-config wiring) is still useful and consumed by step `07`.
- Step `08` is a no-op beyond confirming the manifest's env-key declaration is correct
  and that env-only deployments work.

## Files in this plan set

- `00-EXECUTION-ORDER.md` — sequencing and parallelization notes.
- `00-SUMMARY.md` — this file.
- `01-sdk-package.md` — `@podverse/extensions-sdk`.
- `02-storage-migration-and-orm-service.md` — `0032_extension_settings.sql` + entity +
  service.
- `03-host-resolver-and-cache.md` — env+DB resolver, Valkey cache, per-app empty
  registries.
- `04-web-host-wiring.md` — `<ExtensionHeadScripts />`, master-switch env, CSP merging.
- `05-mgmt-api-extensions-routes.md` — `GET/PUT /extensions`, `extensions_crud`
  permission, integration tests.
- `06-mgmt-web-extensions-pages.md` — list and detail pages, auto-form generator, nav
  entry, i18n.
- `07-cloudflare-extension-package.md` — `extensions/cloudflare-web-analytics/`,
  manifest, web-client, mgmt, registration.
- `08-single-emitter-consolidation.md` — invariant + branch A or B handling + ENV.md
  note.
- `09-tests-and-verification.md` — Playwright + integration + unit + smoke; final make
  commands.
- `COPY-PASTA.md` — sequential prompts to execute the plan set.

## Decisions taken during execution

Record any deviations from the proposal's preferred answers (master-switch name,
permission name, caching TTL, Phase-1 scope) here with a one-line rationale and a
date. Do not edit the proposal RFC after acceptance; supersede it with a new proposal
file if the design changes substantially.

- _(none yet)_

## References

- [docs/proposals/EXTENSIONS.md](../../../../docs/proposals/EXTENSIONS.md)
- Parallel Cursor parent plan: `cloudflare_web_analytics_env_6f142d3e`
- [.cursor/skills/proposals-vs-plans/SKILL.md](../../../../.cursor/skills/proposals-vs-plans/SKILL.md)
