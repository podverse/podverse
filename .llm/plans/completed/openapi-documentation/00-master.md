# Podverse OpenAPI Documentation — Detailed Master Plan

This plan set defines a detailed, split-by-domain documentation strategy for Podverse's public API and Management API, with exhaustive endpoint coverage, interactive Swagger planning, and maintenance patterns to keep docs in sync with code.

## Scope

- **Complete OpenAPI 3.0.3 specification** for both APIs (all endpoints)
- **Interactive Swagger UI** served from each API at `/api/v2/docs`
- **Exhaustive documentation**: schemas, examples, constraints, edge cases
- **Reusable components**: shared schemas to avoid duplication
- **Cursor rule + skill** for keeping docs updated with future code changes
- **One-time implementation effort** with strong future maintenance controls

## Endpoints to Document

### Podverse API (~25 endpoints across routes/)
- Auth (login, logout, me, check-session, mobile token/refresh)
- Account (CRUD operations)
- Podcast/Episode/Clip/Item resources
- Playlist, Queue, Stats
- Product pricing/membership
- Transcripts, Soundbites, Chapters
- Publisher feeds, Mediums, Categories, Channels
- External services (Firebase, PayPal), Metaboost, Podroll
- MQ, ProfileContent, LiveItems

### Management API (~12 endpoints across routes/)
- Auth (login, logout, me)
- Admins (CRUD + invite/redeem)
- Users (CRUD + password)
- Feeds (list, get, lookup, policy state)
- Products (membership, pricing)
- Stats, Storage, Workers, Database

## Plan Map

### 00: Program Control
1. [00-SUMMARY.md](./00-SUMMARY.md) — Fast orientation and file index
2. [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) — Wave execution and parallelization

### 01: Endpoint Census
3. [01-audit-inventory.md](./01-audit-inventory.md) — Audit framework and output expectations
4. [01a-audit-api-route-matrix.md](./01a-audit-api-route-matrix.md) — Public API route inventory and risk tags
5. [01b-audit-management-route-matrix.md](./01b-audit-management-route-matrix.md) — Management API route inventory and risk tags

### 02: Swagger Serving Infrastructure
6. [02-infrastructure-setup.md](./02-infrastructure-setup.md) — Infrastructure strategy and dependencies
7. [02a-swagger-middleware-public-api.md](./02a-swagger-middleware-public-api.md) — Public API docs endpoints plan
8. [02b-swagger-middleware-management-api.md](./02b-swagger-middleware-management-api.md) — Management API docs endpoints plan

### 03: Public API Documentation Tracks
9. [03-document-endpoints.md](./03-document-endpoints.md) — Public API track overview
10. [03a-api-auth-account.md](./03a-api-auth-account.md) — Authentication and account operations
11. [03b-api-content-discovery.md](./03b-api-content-discovery.md) — Feed/item/category/channel/content discovery
12. [03c-api-user-media-and-queues.md](./03c-api-user-media-and-queues.md) — Playlists/clips/chapters/soundbites/transcripts/queue
13. [03d-api-product-membership-and-integrations.md](./03d-api-product-membership-and-integrations.md) — Product membership and integration surfaces
14. [03e-api-route-module-index.md](./03e-api-route-module-index.md) — One subplan per public API route module

### 04: Management API Documentation Tracks
15. [04-testing-validation.md](./04-testing-validation.md) — Management track overview and verification anchor
16. [04a-management-auth-admins.md](./04a-management-auth-admins.md) — Auth/admin role and invitation lifecycle
17. [04b-management-users-feeds.md](./04b-management-users-feeds.md) — User/feed governance
18. [04c-management-products-pricing.md](./04c-management-products-pricing.md) — Membership settings and billing price lifecycle
19. [04d-management-storage-database-workers-stats.md](./04d-management-storage-database-workers-stats.md) — Storage/database/worker/stats operations
20. [04e-management-route-module-index.md](./04e-management-route-module-index.md) — One subplan per management API route module

### 05: Cross-Cutting Documentation Quality
21. [05a-shared-components-and-errors.md](./05a-shared-components-and-errors.md) — Shared components and error envelopes
22. [05b-security-authz-model.md](./05b-security-authz-model.md) — Security/authz semantics and consistency
23. [05c-examples-and-edge-cases.md](./05c-examples-and-edge-cases.md) — Examples, constraints, and boundary behavior

### 06: Validation and Release Readiness
24. [06a-validation-structural.md](./06a-validation-structural.md) — Structural OpenAPI correctness
25. [06b-validation-behavioral-conformance.md](./06b-validation-behavioral-conformance.md) — Code/test conformance checks
26. [06c-swagger-usability-release-readiness.md](./06c-swagger-usability-release-readiness.md) — Human-readable docs quality checks
27. [06d-postman-compatibility-readiness.md](./06d-postman-compatibility-readiness.md) — Postman import/runtime compatibility checks

### 07: Governance and Ongoing Sync
28. [07-governance-cursor-rules-and-pr-checklists.md](./07-governance-cursor-rules-and-pr-checklists.md) — Cursor rules, reviewer checklists, ownership
29. [COPY-PASTA.md](./COPY-PASTA.md) — LLM prompts scoped to each major subtrack

## Deliverables

### Files to Create
- `apps/api/src/lib/swagger-ui.ts` — Swagger UI middleware
- `apps/management-api/src/lib/swagger-ui.ts` — Swagger UI middleware
- `.cursor/rules/openapi-sync.mdc` — Keep docs in sync rule
- `.cursor/skills/openapi-documentation/SKILL.md` — Documentation patterns (optional)

### Files to Modify
- `apps/api/openapi.yml` — Complete spec (~25 endpoints)
- `apps/management-api/openapi.yml` — Complete spec (~12 endpoints)
- Both `package.json` files — Add `swagger-ui-express`
- Both `src/index.ts` files — Integrate middleware
- `apps/api/APPS-API.md`, `apps/management-api/APPS-MANAGEMENT-API.md` — Add OpenAPI links

## Key References

- `apps/api/openapi.yml` (started, incomplete)
- `apps/management-api/openapi.yml` (started, incomplete)
- `apps/api/src/routes/` (~25 route modules)
- `apps/management-api/src/routes/` (~12 route modules)
- `apps/api/APPS-API.md`, `apps/management-api/APPS-MANAGEMENT-API.md`
- `.cursor/rules/` (where new rule will live)
- `.cursor/skills/` (where optional skill will live)

## Critical Decisions

1. **Swagger UI library**: `swagger-ui-express` (lightweight, Express-native)
2. **Spec format**: Single YAML file per API (not split multi-file)
3. **Documentation depth**: Exhaustive (schemas, examples, constraints, all status codes)
4. **Maintenance approach**: Cursor rule + manual code review checklist
5. **Deployment path**: `/api/v2/docs` (standard, non-conflicting)

## Notes

- Both apps already have partial `openapi.yml` files (auth endpoints started)
- No Swagger UI dependencies currently installed
- Routes organized per resource (auth, account, feed, etc.)
- Management API has `product/` subdirectory with additional endpoints
- ORM, Helpers packages provide DTOs usable as OpenAPI schemas

## Timeline

| Phase | Days | Effort | Parallelizable |
|-------|------|--------|-----------------|
| Wave 1 Foundation | 1 | Medium | (API + Mgmt audits in parallel) |
| Wave 2 Core Domains | 1–2 | High | (domain tracks in parallel) |
| Wave 3 High Risk Domains | 1–2 | High | (focused specialist tracks in parallel) |
| Wave 4 Normalization | 1 | Medium | (cross-cutting) |
| Wave 5 Validation + Governance | 1 | Medium | (partial parallelization) |
| **Total** | **5–7 days** | **High** | ✓ Optimized for parallel execution |

**Critical path**: Census and security baseline → domain drafting → high-risk drafting → normalization → validation and governance
