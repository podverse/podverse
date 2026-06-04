# 05 — Abcmemory and doc sync

## Execution context (required)

- Work only from `~/r/p/podverse-custom-css-remote-file`
- Branch must be `feature/custom-css-remote-file`

## Objective

Add durable guidance so custom theme fixtures and docs stay aligned with CSS variable changes.

## Tasks

- Update abcmemory guidance in Podverse and Metaboost `.cursor/` sources:
  - whenever theme CSS variables are added/removed/renamed, update:
    - custom theme example/test-assets JSON files
    - related theme/env documentation
- Ensure wording points to the exact maintained sample files used by operators and E2E.
- Include this requirement in plan docs so future phases enforce it consistently.

## Candidate locations

- Podverse:
  - `.cursor/rules/*` or `.cursor/skills/*` best-fit file for theme/style guidance
- Metaboost:
  - `.cursor/rules/*` or `.cursor/skills/*` equivalent best-fit file

## Exit criteria

- Rule/skill updates are committed in both repos (or explicitly documented if one repo is deferred).
- Future theme variable changes cannot merge without updating examples/docs.
