# Feature: dockerfile-web-stage-1 (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `dockerfile-web-stage-1-part-02.md`.

## Metadata

- Started: 2026-02-13
- Completed: 2026-02-14
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/63
- Branch: feature/dockerfile-web-stage-1
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Extract step 1 (deps) from web and management-web Dockerfiles into standalone base
images published as web-base and management-web-base via the Alpha workflow; main
app Dockerfiles use those published images for the builder stage.

## Sessions

### Session 1 - 2026-02-13

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit
the plan file itself. To-do's from the plan have already been created. Do not
create them again. Mark them as in_progress as you work, starting with the
first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added standalone Dockerfile.base per app (web, management-web) with
  node:24-slim, COPY of package files + packages/ + app package\*.json,
  npm install --ignore-scripts. Build context remains repo root.
- New workflow job publish-base-images builds and pushes web-base and
  management-web-base with unified version + alpha tags; publish-docker now
  needs [validate, publish-base-images] and passes BASE_IMAGE build-arg for
  web-deploy and management-web-deploy using the same version.
- Main Dockerfiles use ARG BASE_IMAGE with default :alpha for local builds;
  builder stage is FROM ${BASE_IMAGE}; no inline base/deps stages.

#### Files Changed

- apps/web/Dockerfile.base (new)
- apps/management-web/Dockerfile.base (new)
- .github/workflows/publish-alpha.yml
- apps/web/Dockerfile
- apps/management-web/Dockerfile

---

## Related Resources

- [Link to PR]
- [Link to related issues]
