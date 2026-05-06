# 03 — K8s Manifests and Secret Management

## Scope

- Rename the DO-branded K8s secret and its generator script to generic names.
- Update every `envFrom` reference in the image-shrink workloads.
- Add the new optional env vars (`BUCKET_ENDPOINT`, `BUCKET_FORCE_PATH_STYLE`,
  `BUCKET_UPLOAD_PUBLIC_ACL`) to the workers ConfigMap source.
- Document the alpha-environment migration so the workload doesn't crash during rollout.

## Renames

- K8s secret:
  - Old: `podverse-workers-digital-ocean-opaque`
  - New: `podverse-workers-storage-bucket-opaque`
- Secret-generator script:
  - Old: `infra/k8s/scripts/secret-generators/create_workers_digital_ocean_secret.sh`
  - New: `infra/k8s/scripts/secret-generators/create_workers_storage_bucket_secret.sh`
- Encrypted output file per environment:
  - Old: `secrets/podverse-${ENV}-workers-digital-ocean-opaque.enc.yaml`
  - New: `secrets/podverse-${ENV}-workers-storage-bucket-opaque.enc.yaml`

Literal keys in the secret remain `BUCKET_ACCESS_KEY` and `BUCKET_SECRET_KEY`.

## Steps

1. Rename the generator script and update its internal variables:
   - `SECRET_NAME="podverse-workers-storage-bucket-opaque"`
   - `OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-workers-storage-bucket-opaque.enc.yaml"`
   - Update banner text: `--- STORAGE BUCKET (S3-compatible) ---` replacing
     `--- DIGITALOCEAN SPACES ---`. Input prompts keep `BUCKET_ACCESS_KEY` /
     `BUCKET_SECRET_KEY` verbatim.
2. Update `infra/k8s/scripts/secret-generators/create_all_secrets_auto_gen.sh`:
   - In `MANUAL_SCRIPTS`, replace the
     `create_workers_digital_ocean_secret.sh (requires DigitalOcean Spaces access/secret keys)`
     entry with
     `create_workers_storage_bucket_secret.sh (requires S3-compatible access/secret keys;
     supported providers listed in docs/image-shrinking/BUCKET-PROVIDERS.md)`.
3. Update `infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`
   references to use the new script name and secret name.
4. Update `envFrom` in every image-shrink workload to use `podverse-workers-storage-bucket-opaque`:
   - [infra/k8s/base/workers/image-shrink-consumer.deployment.yaml](../../../../infra/k8s/base/workers/image-shrink-consumer.deployment.yaml)
   - [infra/k8s/base/cron/worker-image-shrink-backfill.cronjob.yaml](../../../../infra/k8s/base/cron/worker-image-shrink-backfill.cronjob.yaml)
   - [infra/k8s/base/cron/worker-image-shrink-orphan-cleanup.cronjob.yaml](../../../../infra/k8s/base/cron/worker-image-shrink-orphan-cleanup.cronjob.yaml)
   - [infra/k8s/base/cron/worker-image-shrink-source-prune.cronjob.yaml](../../../../infra/k8s/base/cron/worker-image-shrink-source-prune.cronjob.yaml)
5. Update [infra/k8s/base/workers/source/workers.env](../../../../infra/k8s/base/workers/source/workers.env)
   - Keep existing `BUCKET_PROVIDER`, `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_CDN_BASE_URL`.
   - Add new lines (empty by default):
     - `BUCKET_ENDPOINT=`
     - `BUCKET_FORCE_PATH_STYLE=`
     - `BUCKET_UPLOAD_PUBLIC_ACL=`
   - Add per-line `#`-prefixed comments (one variable per comment line, per
     env-file-formatting rule) noting which providers require which vars and pointing to
     `docs/image-shrinking/BUCKET-PROVIDERS.md`.
   - Document that access/secret keys stay in
     `podverse-workers-storage-bucket-opaque` (not in this ConfigMap).
6. Remove now-stale encrypted files for old environments (after step 7 applies the new
   secret) so GitOps doesn't drift:
   - `infra/k8s/alpha/workers/secrets/podverse-alpha-workers-digital-ocean-opaque.enc.yaml`
     (only if it exists; follow the existing per-env secret path convention).

## Alpha-environment migration runbook

Include a short snippet in [infra/k8s/INFRA-K8S.md](../../../../infra/k8s/INFRA-K8S.md)
(or the closest equivalent secrets runbook) covering the rename:

```bash
cd infra/k8s/alpha
bash ../scripts/secret-generators/create_workers_storage_bucket_secret.sh
# Enter alpha when prompted, then supply the existing DO access key and secret
sops -d ./secrets/podverse-alpha-workers-storage-bucket-opaque.enc.yaml | kubectl apply -f -
# Push the renamed manifests to the GitOps branch (develop/alpha per cluster)
# Once the workload is healthy, remove the old secret:
kubectl -n podverse-alpha delete secret podverse-workers-digital-ocean-opaque
```

## Key files to touch

- `infra/k8s/scripts/secret-generators/create_workers_storage_bucket_secret.sh` (new; from rename)
- `infra/k8s/scripts/secret-generators/create_workers_digital_ocean_secret.sh` (delete)
- `infra/k8s/scripts/secret-generators/create_all_secrets_auto_gen.sh`
- `infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`
- [infra/k8s/base/workers/image-shrink-consumer.deployment.yaml](../../../../infra/k8s/base/workers/image-shrink-consumer.deployment.yaml)
- [infra/k8s/base/cron/worker-image-shrink-backfill.cronjob.yaml](../../../../infra/k8s/base/cron/worker-image-shrink-backfill.cronjob.yaml)
- [infra/k8s/base/cron/worker-image-shrink-orphan-cleanup.cronjob.yaml](../../../../infra/k8s/base/cron/worker-image-shrink-orphan-cleanup.cronjob.yaml)
- [infra/k8s/base/cron/worker-image-shrink-source-prune.cronjob.yaml](../../../../infra/k8s/base/cron/worker-image-shrink-source-prune.cronjob.yaml)
- [infra/k8s/base/workers/source/workers.env](../../../../infra/k8s/base/workers/source/workers.env)
- [infra/k8s/INFRA-K8S.md](../../../../infra/k8s/INFRA-K8S.md) (runbook)

## Verification

- `kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/workers/` still
  renders without unresolved references.
- `kustomize build --load-restrictor LoadRestrictionsNone infra/k8s/alpha/cron/` still
  renders for each cronjob.
- `git grep -E "podverse-workers-digital-ocean-opaque|create_workers_digital_ocean_secret"`
  returns zero hits in manifests and scripts (historical LLM history entries are fine).
- The alpha runbook snippet is copy-pasteable and has been reviewed against the existing
  SOPS conventions in `docs/development/k8s/REMOTE-K8S-GITOPS.md`.

## Out of scope for this phase

- Code changes (done in phases 01 and 02).
- User-facing docs outside the runbook snippet — phase 04.
