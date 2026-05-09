# Phase 09 — Tests and verification

Final phase. Lock in behavior with a Playwright spec for management-web, an apps/web
HEAD assertion, an integration test for the cross-DB write, and unit tests for the
Cloudflare extension's `web-client.ts`. Run the full report suite at the end.

## Playwright — management-web `/extensions`

`apps/management-web/e2e/extensions-list-edit.spec.ts`:

- Pre-conditions: seed (or fixture) a superuser admin and ensure the registry
  contains the Cloudflare extension. Set `EXTENSIONS_ENABLED=true` in the test env so
  the nav route is visible.
- **List flow.** Log in as superuser, navigate to `/extensions`, assert the
  Cloudflare row appears with the disabled state.
- **Edit flow.** Click into `/extensions/cloudflare-web-analytics`, fill in a token
  (use a non-real test value, e.g. `00000000000000000000000000000000`), toggle
  enabled to true, Save. Expect a success toast, redirect to the list, and the row
  state to update to enabled.
- **Permission flow.** Log out, log in as a non-superuser admin without
  `extensions_crud`, assert `/extensions` is not in the nav and that direct
  navigation to `/extensions` either redirects or returns the standard
  not-authorized state.
- **Disable flow.** Re-enter as superuser, edit the extension, toggle enabled to
  false, Save. Assert the row reflects the change.

Follow these skills:

- [`e2e-page-tests`](../../../../.cursor/skills/e2e-page-tests/SKILL.md)
- [`e2e-readability`](../../../../.cursor/skills/e2e-readability/SKILL.md)
- [`e2e-crud-state-matrix`](../../../../.cursor/skills/e2e-crud-state-matrix/SKILL.md)
- [`e2e-screenshot-verified-element`](../../../../.cursor/skills/e2e-screenshot-verified-element/SKILL.md)

## Playwright — apps/web HEAD assertion

`apps/web/e2e/extensions-cloudflare-head.spec.ts`:

- Two test contexts:
  - **Off:** `EXTENSIONS_ENABLED=false`. Navigate to the home page and assert no
    `script[src*="cloudflareinsights"]` is present in `<head>`.
  - **On:** `EXTENSIONS_ENABLED=true` plus `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_ENABLED=true`
    plus `EXTENSION_CLOUDFLARE_WEB_ANALYTICS_TOKEN=00000000000000000000000000000000`.
    Navigate to the home page and assert exactly one `script[src*="cloudflareinsights"]`
    is present and that its `data-cf-beacon` JSON parses to `{ token: <value> }`.

The "Off" branch guards against accidental script leakage when the master switch is
off. The "On" branch is the regression guard for the single-emitter invariant from
phase `08`.

If the parallel env plan shipped first (Branch A in phase `08`), add a third context
that sets only the legacy `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` and confirms
the same single beacon is rendered (exercising the alias mapping).

## Integration test recap

Phase `05` already added
`apps/management-api/src/routes/extensions.integration.test.ts`. Re-run it here as
part of the final verification to catch any regressions introduced by phases `06–08`.

## Unit tests recap

Phase `01`/`03` added unit tests for `extensionEnvKey` and `resolveExtensionConfig`.
Phase `07` should add at least one unit test for the Cloudflare extension's
`web-client.ts`:

- `headScripts` with empty token returns `[]`.
- `headScripts` with valid token returns one descriptor whose `src` is
  `https://static.cloudflareinsights.com/beacon.min.js` and whose `data-cf-beacon`
  parses to `{ token }`.
- `headScripts` with `beaconUrl` override uses the override.

If those tests have not been added during phase `07`, add them now.

## i18n sync

Run the i18n sync per the [`i18n`](../../../../.cursor/skills/i18n/SKILL.md) skill so
that the new management-web keys land in every locale's `i18n/originals/<locale>.json`
and any override files. Confirm with the locale validator the project already runs in
CI.

## Lint, build, and report runs

Final verification commands. Run them sequentially.

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w apps/management-api
./scripts/nix/with-env npm run build -w apps/management-web
./scripts/nix/with-env npm run build -w apps/web
./scripts/nix/with-env make test_deps
./scripts/nix/with-env npm run test:e2e:api
```

Then the make-based scoped reports for the new specs:

```bash
make e2e_test_management_web_report_spec SPEC=e2e/extensions-list-edit.spec.ts
make e2e_test_web_report_spec SPEC=e2e/extensions-cloudflare-head.spec.ts
```

If both reports pass, the plan set is complete. Per the
[`plan-completion`](../../../../.cursor/skills/plan-completion/SKILL.md) skill, move
the entire `extensions-framework/` directory from
`.llm/plans/active/` to `.llm/plans/completed/`.

## Optional final smoke

`make e2e_test_report` runs the full E2E suite for catch-all confidence. Use this
only when the change is broad enough to warrant it; for this scoped feature the two
specs above are the gating signal.
