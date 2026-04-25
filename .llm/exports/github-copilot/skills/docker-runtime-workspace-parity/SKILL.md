---
name: docker-runtime-workspace-parity
description: Prevents workspace package omissions in multi-stage Docker images by verifying runtime-stage COPY coverage for every app dependency. Use when editing Dockerfiles, debugging ERR_MODULE_NOT_FOUND in containers, or changing workspace dependencies for api/management-api/workers.
---


# Docker Runtime Workspace Parity

Use this skill for Podverse Node app images that use multi-stage Dockerfiles.

## Why

Builder stages can compile successfully while runtime stages fail if a workspace package is not copied into the final image.

Typical failure:

- `ERR_MODULE_NOT_FOUND`
- Missing package like `@podverse/worker-commands` at container startup

## Required Checks

1. Identify all `@podverse/*` dependencies in the target app's `package.json`.
2. In the Dockerfile runtime stage, verify each dependency package has both:
   - `COPY --from=builder .../package.json ...`
   - `COPY --from=builder .../dist/ ...`
3. If a dependency is missing, add both COPY lines.
4. Rebuild the image and confirm runtime startup/module import works.

## Scope

Apply this to:

- `apps/api/Dockerfile`
- `apps/management-api/Dockerfile`
- `apps/workers/Dockerfile`

Also apply to any new Podverse app Dockerfile with the same multi-stage pattern.

## Fast Verification Pattern

From monorepo root, after Dockerfile edits:

```bash
docker build -f apps/workers/Dockerfile -t podverse-workers:test .
docker run --rm podverse-workers:test node apps/workers/dist/commands/commandNames.js
```

Use an equivalent command for the app you changed (for example, `apps/api` or `apps/management-api`).
