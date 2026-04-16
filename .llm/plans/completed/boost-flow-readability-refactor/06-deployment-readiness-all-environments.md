# 06 - Deployment Readiness (All Environments)

## Status

Completed with manual follow-up note:

- Deployment evidence artifacts were captured for all four target environments.
- User will manually complete remaining live k8s validation work.
- Run blockers recorded in artifacts: missing `local_k8s_up` make target and `kubectl` API endpoint timeout for local/remote checks.

## Objective

Confirm deployment/runtime surfaces are prepared for the new MetaBoost logic across all supported deployment paths.

## Environments

1. local + npm
2. local Docker only
3. local k8s
4. remote k8s

## Scope

- Verify required env/config values are available where needed.
- Verify runtime-config sidecar exposure includes required MetaBoost values.
- Verify no deployment path silently strips or fails MetaBoost-related config.
- Verify docs/runbooks are accurate for each environment.

## Candidate Files To Audit/Update

- web config/runtime sidecar:
  - `apps/web/src/config/index.ts`
  - `apps/web/src/config/runtime-config.ts`
  - `apps/web/sidecar/src/server.ts`
  - `apps/web/sidecar/.env.example`
- local setup and env propagation:
  - `scripts/local-env/setup.sh`
  - `dev/env-overrides/local/lightning.env.example`
- docker/k8s envs:
  - `infra/config/local/*.env` (as needed)
  - `infra/k8s/base/web/source/web-sidecar.env`
  - related kustomize overlays if needed
- operational docs:
  - `apps/web/ENV.md`
  - `docs/v4v/**` and any k8s runbook references

## Validation Checklist Per Environment

### Local + npm

- sidecar receives MetaBoost env values
- `apps/web` runtime config contains expected MetaBoost fields
- web build/dev starts successfully

Commands:

```bash
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w @podverse/web
./scripts/nix/with-env npm run dev:web-sidecar
```

Pass criteria:

- Sidecar startup validation passes.
- `/runtime-config` includes `NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD` and `NEXT_PUBLIC_APP_VALUE_METABOOST_NODE`.
- Web app starts and boost flow remains functional.

### Local Docker only

- compose-injected env includes sidecar MetaBoost values
- web container can fetch runtime config with those values
- no startup validation regressions

Commands:

```bash
make local_env_setup
make local_build_web_runtime_config
make local_build_web
make local_infra_up
```

Pass criteria:

- Web sidecar container logs show successful validation.
- Runtime-config endpoint returns MetaBoost env keys.
- Web container resolves runtime config without startup errors.

### Local k8s

- rendered manifests include expected env keys/values
- sidecar and web pods start cleanly
- runtime config endpoint exposes expected keys

Commands:

```bash
make local_env_setup
make local_k8s_up
kubectl get pods -A
kubectl logs deployment/podverse-local-web-runtime-config -n podverse-local --tail=200
```

Pass criteria:

- Rendered/deployed manifests include MetaBoost env keys in web sidecar.
- Pods are healthy (no crash loop due to missing env).
- Sidecar runtime endpoint exposes MetaBoost keys.

### Remote k8s

- GitOps-managed env sources include required MetaBoost keys
- rollout does not regress existing startup validation
- runbook notes include required updates and verification command(s)

Commands:

```bash
git diff -- infra/k8s
kubectl get applications -A
kubectl get pods -A
```

Pass criteria:

- GitOps-tracked manifests contain MetaBoost env updates.
- Remote sidecar pods pass startup validation.
- No rollout regressions attributable to missing/invalid MetaBoost env.

## Acceptance Criteria

- All four deployment process categories are explicitly checked and documented.
- Required config path for MetaBoost is consistent across environments.
- No environment-specific blockers remain for MetaBoost logic rollout.

## Required Deployment Evidence Artifacts

For each environment (local npm, local Docker, local k8s, remote k8s), capture:

- executed commands
- runtime-config payload excerpt containing MetaBoost keys
- service/pod/container health evidence
- one scenario result proving MB1-capable flow can still initialize correctly

Save artifacts in:

- `.llm/plans/active/boost-flow-readability-refactor/deployment-artifacts/<environment>.md`

Minimum files:

- `deployment-artifacts/local-npm.md`
- `deployment-artifacts/local-docker.md`
- `deployment-artifacts/local-k8s.md`
- `deployment-artifacts/remote-k8s.md`
