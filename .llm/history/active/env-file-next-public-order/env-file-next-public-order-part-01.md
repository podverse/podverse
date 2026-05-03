# env-file-next-public-order

## Started

2026-05-03

## Context

Standardize env files so non-`NEXT_PUBLIC_*` keys precede `NEXT_PUBLIC_*`; document in skill/rules.

### Session 1 - 2026-05-03

#### Prompt (Developer)

@podverse/infra/k8s/base/management-web/source/management-web-sidecar.env:12-14 sweep through all the podverse and metaboost env files. we always want the non NEXT*PUBLIC*_ env vars to appear above the NEXT*PUBLIC*_ env vars. add or update a skill if needed to remember.

#### Key Decisions

- Moved `READINESS_*` (and `NODE_ENV`) above all `NEXT_PUBLIC_*` in Podverse base web/management-web sidecar ConfigMap sources.
- Reordered Metaboost base web/management-web sidecar env: ports, server URLs, readiness, then all `NEXT_PUBLIC_*`.
- Fixed Podverse `socials.env.example` (API `SOCIAL_*` before web `NEXT_PUBLIC_*`) and `metaboost.env.example` (API signing vars before web `NEXT_PUBLIC_*`).
- Extended Podverse `env-file-formatting` skill + rule; added Metaboost `env-file-formatting` skill and rule bullet.

#### Files Created/Modified

- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`
- `dev/env-overrides/local/socials.env.example`
- `dev/env-overrides/local/metaboost.env.example`
- `.cursor/skills/env-file-formatting/SKILL.md`
- `.cursor/rules/env-file-formatting.mdc`
