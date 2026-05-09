# extensions-framework — copy-pasta

Phases are sequential. Run one prompt at a time and wait for it to finish before
running the next. Within Phase 2, the two prompts (`04` and `05`) may run in parallel
in two separate agents if you have them; otherwise just run them sequentially.

Each prompt below references its detailed plan file by relative path. Pasting a prompt
is the instruction to execute the referenced file in full.

## Phase 1 — Foundation (sequential)

- [ ] **Phase 01.** Read and execute
      `.llm/plans/active/extensions-framework/01-sdk-package.md`. Create the
      `@podverse/extensions-sdk` workspace with types only and unit tests for any
      Joi-based helpers introduced. End response with the lint and unit-test commands
      called out in the file.

- [ ] **Phase 02.** Read and execute
      `.llm/plans/active/extensions-framework/02-storage-migration-and-orm-service.md`.
      Add `NNNN_extension_settings.sql` (next free migration number), regenerate the
      linear baseline gz, add the
      ORM entity and `ExtensionSettingsService`, and add integration tests that run
      against the `podverse_app_test` database. End response with the integration-test
      command from the file.

- [ ] **Phase 03.** Read and execute
      `.llm/plans/active/extensions-framework/03-host-resolver-and-cache.md`. Implement
      `resolveExtensionConfig` in the SDK, add Valkey cache helpers, and add empty
      registries in each host app. End response with the unit-test command from the
      file.

## Phase 2 — Host surfaces (parallel after Phase 1)

If running with two agents, paste both prompts at the same time after Phase 1
finishes. If running serially, run `04` then `05`.

- [ ] **Phase 04.** Read and execute
      `.llm/plans/active/extensions-framework/04-web-host-wiring.md`. Add the head-script
      and providers components, integrate them into `apps/web/src/app/layout.tsx`, add
      master-switch and per-extension env keys to the runtime-config pipeline and
      sidecar, and add CSP merging. End response with the lint and build commands from
      the file.

- [ ] **Phase 05.** Read and execute
      `.llm/plans/active/extensions-framework/05-mgmt-api-extensions-routes.md`. Add
      `GET /extensions`, `GET /extensions/:id`, and `PUT /extensions/:id`, the new
      `extensions_crud` permission, and integration tests. End response with the
      management-api integration-test command from the file.

## Phase 3 — Management UI (sequential after Phase 2)

- [ ] **Phase 06.** Read and execute
      `.llm/plans/active/extensions-framework/06-mgmt-web-extensions-pages.md`. Add
      the `/extensions` list and `[id]` detail pages, the auto-form generator, the nav
      entry, and i18n keys. End response with the make command for the management-web
      E2E spec from the file.

## Phase 4 — First extension and consolidation (sequential)

- [ ] **Phase 07.** Read and execute
      `.llm/plans/active/extensions-framework/07-cloudflare-extension-package.md`.
      Create `extensions/cloudflare-web-analytics/` with manifest, web-client, mgmt,
      LICENSE, README, and register it in the web and management-web registries.
      End response with lint and build commands.

- [ ] **Phase 08.** Read and execute
      `.llm/plans/active/extensions-framework/08-single-emitter-consolidation.md`.
      Apply Branch A or Branch B as documented in `00-SUMMARY.md`, depending on
      whether the parallel env plan has shipped. Add the ENV.md note. End response
      with the make command for the apps/web E2E head-assertion spec.

## Phase 5 — Verification

- [ ] **Phase 09.** Read and execute
      `.llm/plans/active/extensions-framework/09-tests-and-verification.md`. Add the
      Playwright spec for management-web `/extensions` and the apps/web HEAD assertion,
      finalize unit tests, and run the full report commands listed in the file. End
      response with both make report commands.

## Phase 6 — Archive

- [ ] **Archive.** Per the
      [`plan-completion`](../../../../.cursor/skills/plan-completion/SKILL.md) skill,
      move the entire `extensions-framework/` directory from
      `.llm/plans/active/` to `.llm/plans/completed/`.
