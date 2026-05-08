# mgmt-api-data-hierarchy — copy-pasta

Phases are sequential. Run one at a time.

- [ ] Phase 01: Read `01-principles-and-conventions.md`. No code changes.
      Confirm decisions D1–D5 still hold.
- [ ] Phase 02: Implement `02-admins-consolidation.md` — delete `adminAccount.ts`
      and `adminSetPassword.ts`, add `POST /admins/invite-link/redeem`,
      mount-style `admins.ts`, move public web page to
      `/admins/redeem-invite-link`, update `submitAdminSetPassword` ->
      `redeemAdminInviteLink`, fold tests into `admins.integration.test.ts`.
      End response with the e2e make command for
      `admins-detail-invite.spec.ts,admins-list.spec.ts`.
- [ ] Phase 03: Implement `03-users-resource.md` — `POST /users/:id/password`,
      mount-style `users.ts`, update request module, integration tests, and
      end response with e2e make command for users specs.
- [ ] Phase 04: Implement `04-feeds-resource.md` — rename to `/feeds`,
      `PATCH /feeds/:id/policy-state`, mount-style, rename router/test/request
      files and the web page directory `/feed-operations` -> `/feeds`. End
      response with the e2e make command for `feeds-flag-status.spec.ts`.
- [ ] Phase 05: Implement `05-products-pluralization.md` — `/product` ->
      `/products`, rename routes dir, update request modules and tests. End
      response with the e2e make command for `products-hub.spec.ts`.
- [ ] Phase 06: Implement `06-stats-hierarchy.md` — invert to
      `/stats/:entityType/{top,search,:id}`, mount-style, update tests and
      request module. End response with the e2e make command for
      `stats-page.spec.ts`.
- [ ] Phase 07: Implement `07-workers-resource.md` — rename to
      `/workers/commands`, mount-style, rename router/test/request files. End
      response with the e2e make command for `workers-page.spec.ts`.
- [ ] Phase 08: Implement `08-storage-and-database-tidy.md` — mount-style only,
      no URL changes. End response with the e2e make command for
      `storage-superuser-crud-enabled.spec.ts,database-table-browser.spec.ts`.
- [ ] Phase 09: Implement `09-auth-tidy.md` — mount-style only. End response
      with the e2e make command for `smoke.spec.ts,navbar-chrome.spec.ts`.
- [ ] Phase 10: Implement `10-verify-and-docs.md` — APPS-MANAGEMENT-API.md
      update, repo-wide rg sweep, run full lint/build/integration/management-web
      E2E. End response with the full e2e report make command.
