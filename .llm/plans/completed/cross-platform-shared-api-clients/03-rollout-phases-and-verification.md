# Rollout phases and verification

Phases are **sequential**. Stop after any phase if priorities shift; each phase should leave main
and management-web green.

## Phase 1 — Contract freeze and ADR-quality docs

- Write a short **client boundary doc** under `docs/development/` (title TBD): list both APIs’ base
  URL env vars, cookie names, and bearer-first strategy for mobile.
- Define and document auth context contract (`cookie`, `bearer`, `headers`, `none`).
- Define mobile token endpoint requirements for both `apps/api` and `apps/management-api`:
  issuance, rotating refresh semantics, revoke/logout, and scope boundaries.
- Document token policy as shared core model with explicit per-API claim/TTL overrides.
- Add checklist item for new management-api routes: update shared management client module.
- Add short “migration guardrails” section: no package imports from `apps/*`.

**Verify:** Doc review only.

**Acceptance criteria:**

- Documentation exists and is linked from relevant AGENTS/docs pages
- Mobile bearer strategy is explicitly recorded as baseline
- Mobile token endpoint behavior is documented before coding

## Phase 2 — Build `http-client-core` and wire main client

- Create `packages/http-client-core` with shared request primitive and error normalization.
- Refactor `packages/helpers-requests` internals to consume core (no public API break).
- Normalize JSON method behavior across clients (`POST`, `PUT`, `PATCH`).
- Preserve current behavior expected by `apps/web`.

**Verify:**

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
```

**Acceptance criteria:**

- `helpers-requests` builds using core package
- no regressions in existing web request helper tests

## Phase 3 — Create `management-api-requests` package and migrate modules

- Create new package `@podverse/management-api-requests`.
- Move management client/service + typed request modules from
  `apps/management-web/src/lib/requests/*.ts` into package.
- Leave thin compatibility re-exports in app-local request modules to reduce app churn.
- Ensure package contains no `next/*` imports and no `apps/*` imports.

**Verify:**

```bash
./scripts/nix/with-env npm run test:e2e:api
make e2e_test_management_web_report_spec SPEC=e2e/smoke.spec.ts
```

**Acceptance criteria:**

- `apps/management-web` imports package-level request APIs
- management API integration tests and management-web smoke pass
- app-local request files are pass-through only or removed

## Phase 4 — Auth injector refactor and bearer-ready constructors

- Replace inline cookie string composition with shared auth context constructor utilities.
- Update SSR session helper boundaries to produce auth context objects.
- Add bearer constructor examples in both client packages.
- Keep browser session/cookie behavior unchanged.

**Verify:**

```bash
./scripts/nix/with-env npm run test:e2e:api
make e2e_test_report_scoped WEB_SPEC=e2e/smoke.spec.ts MGMT_SPEC=e2e/smoke.spec.ts
```

**Acceptance criteria:**

- both clients can be instantiated with bearer auth without app-specific imports
- web/SSR session paths still function with cookie auth context

## Phase 5 — Mobile token endpoint implementation (API work)

- Implement token endpoint(s) in `apps/api` and `apps/management-api` based on Phase 1 contracts.
- Implement rotating refresh token storage/invalidation model (token family + replay/reuse defense).
- Add/update OpenAPI docs for endpoint request/response and auth semantics.
- Add integration tests for:
  - token issuance success/failure
  - refresh/rotation behavior
  - refresh token reuse detection/denial behavior
  - revoke/logout invalidation
  - incorrect scope/actor handling
- Add corresponding typed request modules in:
  - `@podverse/helpers-requests`
  - `@podverse/management-api-requests`

**Verify:**

```bash
./scripts/nix/with-env npm run test:e2e:api
make e2e_test_report_scoped WEB_SPEC=e2e/smoke.spec.ts MGMT_SPEC=e2e/smoke.spec.ts
```

**Acceptance criteria:**

- both APIs expose documented mobile token endpoints
- integration coverage exists for happy path and key deny paths
- client packages include typed wrappers for the new endpoints
- refresh token replay/reuse handling is covered and enforced

## Phase 6 — Mobile spike (outside monorepo scope note)

- When a mobile repo exists, consume both client packages with bearer auth mode.
- Create a short integration spike checklist (base URL config, token refresh expectations, error
  shape assumptions).
- Keep mobile verification out of current Podverse CI until a dedicated mobile workspace exists.

**Acceptance criteria:**

- mobile spike imports both clients without patching package internals
- no Next/browser globals required by client package runtime

## Risks

- **Lockfile / workspace:** New packages require `make sync_lockfile` / Linux lockfile policy per
  `AGENTS.md`.
- **Bearer support parity:** management-api and apps/api bearer behavior must be aligned or clearly
  documented as intentionally different.
- **Bundle size:** Shared clients should remain tree-shake friendly; avoid importing Node-only APIs
  into RN bundles.
- **Migration fatigue:** moving many request modules can create noisy PRs; use compatibility
  re-exports to phase safely.
- **Auth security risk:** token endpoint rollout requires explicit security review and deny-path tests.
- **State management risk:** rotating refresh requires durable token state and cleanup strategy.

## Rollback strategy

- Preserve pass-through app-local request modules until package migration is stable.
- If regressions emerge, temporarily route app imports back to prior app-local implementations while
  retaining new package skeleton.
