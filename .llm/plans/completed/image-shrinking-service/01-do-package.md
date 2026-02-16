---
name: Image Shrinking Service - DO Package
overview: >
  Add the DigitalOcean external services package and wire config/validation in apps.
todos: []
isProject: false
---

# Image Shrinking Service - DO Package

## Scope

- Add `packages/external-services-digital-ocean/` with DO Spaces helper methods.
- Wire env config and validation in the apps that will run the worker.
- Capture DO Spaces setup and required env vars for deployment docs.
- Update env templates and infra references for deployment.


## Key Files

- External services pattern:
  - [packages/external-services-paypal/src/index.ts](/Users/mitcheldowney/repos/pv/podverse/packages/external-services-paypal/src/index.ts)
- App config:
  - [apps/workers/src/config/index.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/config/index.ts)
  - Validator files in the same config area
- Env templates:
  - [infra/config/env-templates/workers.env.example](/Users/mitcheldowney/repos/pv/podverse/infra/config/env-templates/workers.env.example)
- K8s manifests (locate workers deployment/env refs):
  - [infra/k8s/base/workers/configmap.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/configmap.yaml)
  - [infra/k8s/base/workers/parser-ondemand.deployment.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/parser-ondemand.deployment.yaml)
  - [infra/k8s/base/workers/parser-normal.deployment.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/parser-normal.deployment.yaml)
  - [infra/k8s/base/workers/parser-live.deployment.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/parser-live.deployment.yaml)
  - [infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml)
  - [infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml)
  - [infra/k8s/base/workers/listener-live.deployment.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/listener-live.deployment.yaml)
  - [infra/k8s/base/workers/consumer-dlq.deployment.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/workers/consumer-dlq.deployment.yaml)
  - [infra/k8s/alpha/workers/kustomization.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/alpha/workers/kustomization.yaml)
  - [infra/k8s/alpha/apps/workers.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/alpha/apps/workers.yaml)
  - [infra/k8s/base/cron/kustomization.yaml](/Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/cron/kustomization.yaml)

## Steps

- Create package structure with `package.json`, `tsconfig.json`, `src/index.ts`.
- Export a `DigitalOceanService` with:
  - `uploadResizedImage({ bucket, key, body, contentType })`
  - `deleteImageByKey({ bucket, key })`
  - `getPublicUrl({ cdnBaseUrl, key })`
- Add config types and env mapping (DO access key/secret, region, bucket, CDN endpoint).
- Add config validation to workers startup validation.
- Instantiate the service in workers app startup/factory.
- Document DO setup steps and env vars for `docs/IMAGE-SHRINKING-SERVICE.md`.
- Add env vars to `infra/config/env-templates/workers.env.example`.
- Add k8s secret/configmap references for the workers deployment.
- Mirror k8s additions in ArgoCD overlays if they exist in this repo.
- Ensure DO credentials are sourced from secrets (not configmaps) in workers manifests.
- Add a cronjob manifest for the hourly batch resize run under
  `infra/k8s/base/cron/worker-image-shrinking.cronjob.yaml`.

## K8s Secret Workflow

- Add a new script following the pattern in
  `infra/k8s/scripts/create_api_secret.sh`:
  - Use the `create_*_secret.sh` naming convention.
  - Recommended name: `infra/k8s/scripts/create_workers_digital_ocean_secret.sh`
  - Output file:
    `infra/k8s/secrets/podverse-${ENV}-workers-digital-ocean-opaque.enc.yaml`
- Script should create a `podverse-workers-digital-ocean-opaque` secret with:
  - `DIGITAL_OCEAN_ACCESS_KEY`
  - `DIGITAL_OCEAN_SECRET_KEY`
  - `DIGITAL_OCEAN_REGION`
  - `DIGITAL_OCEAN_BUCKET`
  - `DIGITAL_OCEAN_CDN_BASE_URL`
- Apply with:
  - `sops -d <secret-file> | kubectl apply -f -`
- Reference the secret in workers deployments via `envFrom` or explicit `env` vars.

## DO Spaces Setup (Plan)

- Create a new Space for resized images.
- Enable CDN for the Space and record the CDN base URL.
- Configure CORS to allow web app origins to fetch images.
- Record access key, secret, region, and bucket name.

## Required Env Vars (Initial)

- `DIGITAL_OCEAN_ACCESS_KEY`
- `DIGITAL_OCEAN_SECRET_KEY`
- `DIGITAL_OCEAN_REGION`
- `DIGITAL_OCEAN_BUCKET`
- `DIGITAL_OCEAN_CDN_BASE_URL`
- `IMAGE_SHRINK_WIDTH_PX`
- `IMAGE_SHRINK_BATCH_SIZE`
- `IMAGE_SHRINK_CONCURRENCY`
- `IMAGE_SHRINK_RPS`

## Rollout Gates

- DO Space + CDN live and validated.
- Worker envs wired in templates and k8s/ArgoCD.
- Workers deployed with new envs before backfill runs.


## Deliverable

- Reusable package consumable by workers (and later by API if needed).
- Deployment/setup documentation in `docs/IMAGE-SHRINKING-SERVICE.md`.
