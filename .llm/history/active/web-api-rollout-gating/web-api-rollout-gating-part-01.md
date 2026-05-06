# web-api-rollout-gating

## Started

2026-05-03

## Context

Strengthen web to API rollout gating so web does not go ready while only older API pods are serving during migration-gated rollouts.

### Session 1 - 2026-05-03

#### Prompt (Developer)

Stronger web ↔ API rollout gating

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

you stalled. continue

#### Key Decisions

- Added a required `API_RELEASE` env contract to Podverse API and management-api config/startup validation and exposed it in versioned `/meta` responses.
- Strengthened web and management-web init gating to require both API `version` and `release` in `/meta`.
- Added base and alpha K8s env wiring for `API_RELEASE` and `READINESS_API_EXPECTED_RELEASE`.

#### Files Modified

- `apps/api/src/config/index.ts`
- `apps/api/src/app.ts`
- `apps/api/src/lib/startup/validation.ts`
- `apps/api/src/test/setup.ts`
- `apps/api/.env.example`
- `apps/management-api/src/config/index.ts`
- `apps/management-api/src/app.ts`
- `apps/management-api/src/lib/startup/validation.ts`
- `apps/management-api/vitest.setup.ts`
- `apps/management-api/.env.example`
- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/management-api/source/management-api.env`
- `infra/k8s/base/web/deployment.yaml`
- `infra/k8s/base/management-web/deployment.yaml`
- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`
- `infra/k8s/alpha/api/source/api.env`
- `infra/k8s/alpha/management-api/source/management-api.env`
- `infra/k8s/alpha/web/source/web-sidecar.env`
- `infra/k8s/alpha/management-web/source/management-web-sidecar.env`

### Session 2 - 2026-05-03

#### Prompt (Developer)

across all example files and base env files use this as an example version

X.Y.Z-staging.N

#### Key Decisions

- Standardized placeholder release strings in app `.env.example` and `infra/k8s/base/**/source/*.env` to literal `X.Y.Z-staging.N` (quoted in `.env.example`, unquoted in K8s ConfigMap sources).
- Left GitOps alpha overlays and monorepo alpha pins unchanged so immutable Git refs and CI version-contract checks stay valid.

#### Files Modified

- `apps/api/.env.example`
- `apps/management-api/.env.example`
- `infra/k8s/base/api/source/api.env`
- `infra/k8s/base/management-api/source/management-api.env`
- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/k8s/base/management-web/source/management-web-sidecar.env`
