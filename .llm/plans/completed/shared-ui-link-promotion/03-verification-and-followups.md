# 03 - Verification And Follow-Ups

## Prompt

Now that the shared `Link` is in place and the web wrapper is migrated, run
the full verification sweep and confirm there are no regressions.

1. **Lint and type-check** the touched workspaces (run from monorepo root):

   ```bash
   ./scripts/nix/with-env npm run lint -w @podverse/ui
   ./scripts/nix/with-env npm run type-check -w @podverse/ui
   ./scripts/nix/with-env npm run lint -w @podverse/web
   ./scripts/nix/with-env npm run type-check -w @podverse/web
   ```

   Use **`-w @podverse/web`** (not `apps/web`) so npm does not also pick up
   **`apps/web/sidecar`**, which lacks matching scripts.

2. **Build packages and the web app:**

   ```bash
   ./scripts/nix/with-env npm run build:packages
   ./scripts/nix/with-env npm run build -w @podverse/web
   ```

3. **Run `@podverse/ui` unit tests** (the new `Link.test.tsx` must pass):

   ```bash
   ./scripts/nix/with-env npm run test -w @podverse/ui
   ```

4. **Verify the shared `Link` subtree stays framework-agnostic.** The Link
   promotion must not add **`next/*`** or **`@podverse/helpers`** under
   **`packages/ui/src/components/navigation/Link/`**.

   ```bash
   rg -n "from ['\"]next/" packages/ui/src/components/navigation/Link
   rg -n "@podverse/helpers" packages/ui/src/components/navigation/Link
   ```

   Both must return **zero** matches.

   **Note:** A repo-wide `rg` over **`packages/ui/src`** may still match
   **`next/image`**, **`next/link`**, or **`@podverse/helpers`** in older
   components (e.g. Image, Toast). That baseline is unrelated to this Link
   migration.

5. **Run scoped E2E.** The `Link` component is used widely in `apps/web`
   (about 31 callsites: home, podcasts, episodes, clips, livestreams,
   chapters, contact, side bar, podroll, footer, source selectors, media
   modals, etc.). Pick a small set of representative specs that exercise
   different render branches (button, anchor, blocked, full page load):

   ```bash
   make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts,e2e/navbar-chrome.spec.ts,e2e/likes-auth-and-more-menu.spec.ts
   ```

   If any of those specs do not exist or have been renamed, substitute the
   nearest equivalent under `apps/web/e2e/` (use `Glob` against
   `apps/web/e2e/**/*.spec.ts` to confirm filenames). Adjust spec list as
   needed.

## Acceptance Criteria

- Lint, type-check, and build pass for `@podverse/ui` and `apps/web`.
- `@podverse/ui` tests (including the new `Link.test.tsx`) pass.
- **`packages/ui/src/components/navigation/Link`** has no `next/*` or
  `@podverse/helpers` imports.
- The selected web E2E specs pass with no visible regressions in link
  behavior (anchor vs button vs disabled vs full page load).
- The ADR exclusion update from `02` is committed.

## Final Verification Commands

```bash
./scripts/nix/with-env npm run lint -w @podverse/ui
./scripts/nix/with-env npm run type-check -w @podverse/ui
./scripts/nix/with-env npm run test -w @podverse/ui
./scripts/nix/with-env npm run lint -w @podverse/web
./scripts/nix/with-env npm run type-check -w @podverse/web
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w @podverse/web
make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts,e2e/navbar-chrome.spec.ts,e2e/likes-auth-and-more-menu.spec.ts
```

---

## Verification results — 2026-05-07

**Executed in CI/agent environment**

| Step | Result |
| ---- | ------ |
| Lint / type-check `@podverse/ui` | Pass |
| Lint / type-check `@podverse/web` | Pass (after ESLint auto-fixed import order in `apps/web/src/components/Link/Link.tsx`) |
| `build:packages` + `build -w @podverse/web` | Pass |
| `npm run test -w @podverse/ui` | Pass (112 tests) |
| `rg` on `packages/ui/.../navigation/Link` | Zero matches for `next/` and `@podverse/helpers` |
| Scoped E2E | **Not completed here** — `make test_db_init` failed (`mapfile: command not found` from `run-linear-migrations.sh` when `make` uses a non-bash `SHELL`). Run E2E locally in a normal dev shell (bash, `psql` on PATH via `./scripts/nix/with-env`), then run the **`make e2e_test_web_report_spec`** line above. |

**Follow-ups merged during this step**

- **`packages/ui/.../Link/Link.test.tsx`:** Replaced mock access `mock.calls[0][0]` with
  **`toMatchObject`** to satisfy strict **`tsc`** (TS2532).
- **`apps/web/.../Link/Link.tsx`:** Import order aligned with **`simple-import-sort`**
  (type import from `@podverse/ui` before value import).
