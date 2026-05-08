# mgmt-api-data-hierarchy — execution order

1. `01-principles-and-conventions.md` — naming, mount-style, hierarchy contract
2. `02-admins-consolidation.md` — merge admin-account/\* into /admins, public redeem-invite
3. `03-users-resource.md` — /users/:id/password subresource, mount-style
4. `04-feeds-resource.md` — /feed-operations -> /feeds, PATCH /feeds/:id/policy-state
5. `05-products-pluralization.md` — /product -> /products
6. `06-stats-hierarchy.md` — /stats/:entityType/{top,search,:id}
7. `07-workers-resource.md` — /worker-commands -> /workers/commands
8. `08-storage-and-database-tidy.md` — mount-style only, no URL change
9. `09-auth-tidy.md` — mount-style only, no URL change
10. `10-verify-and-docs.md` — APPS-MANAGEMENT-API.md, lint/build/integration/E2E

Phases are sequential. Each phase touches the management-api router file, the
matching `*.integration.test.ts`, the `apps/management-web/src/lib/requests/*`
module, any management-web pages, and any e2e specs that reference the renamed
paths.

See `COPY-PASTA.md` for one-shot prompts per phase.
