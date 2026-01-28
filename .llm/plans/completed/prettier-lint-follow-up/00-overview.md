# Prettier Lint Follow-Up – Overview

## Goal

Complete the remaining items from the [Prettier lint integration](../prettier-lint-integration/00-overview.md) plan that were deferred or worked around.

## What Was Deferred

1. **`infra/docker/ci/docker-compose.yml`** – Has duplicate `environment` YAML keys under `podverse_jenkins_docker`. The file was added to [.prettierignore](../../../../.prettierignore) so Prettier skips it. Fixing the YAML allows Prettier to format it and removes the need to ignore it.

2. **Optional: prettier-plugin-sh** – Format shell scripts (`.sh`). The original plan listed this as optional; not implemented.

3. **Optional: lint-staged + Prettier** – Run Prettier on staged files at commit time so format-on-commit aligns with `lint:fix`. The repo uses custom git hooks (commit-msg, pre-push) but not lint-staged. Adding it is optional.

## Plan Parts

1. **[01-fix-docker-compose-yml.md](01-fix-docker-compose-yml.md)** – Fix duplicate `environment` keys, remove from `.prettierignore`, run Prettier on the file.

2. **[02-optional-shell-and-precommit.md](02-optional-shell-and-precommit.md)** – Optional: add `prettier-plugin-sh` for `.sh` formatting, and/or add `lint-staged` + Prettier for format-on-commit.

## Verification

- `npm run prettier:check` passes with `infra/docker/ci/docker-compose.yml` **in** Prettier scope (no longer ignored).
- `npm run lint` still passes.
- If you add lint-staged: committing staged files runs Prettier on them and they stay formatted.
