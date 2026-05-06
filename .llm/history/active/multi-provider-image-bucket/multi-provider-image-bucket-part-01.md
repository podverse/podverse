# multi-provider-image-bucket

## Started

- **Author**: Agent (Cursor)
- **Context**: Implement multi-provider S3-compatible bucket support for image shrink; save plan files and ship code + docs + K8s.

---

### Session 1 - 2026-05-04

#### Prompt (Developer)

```text
# Background

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.
```

#### Key Decisions

- Added `@podverse/external-services-object-storage` with `buildS3MiniEndpoint`, `ObjectStorageService`, and `BUCKET_PROVIDERS` / `isBucketProvider`.
- Expanded `ImageStorageService` to include list/delete/exists; orphan cleanup uses `getImageStorageService()`.
- Config: `getBucketRuntimeConfig()`, `SUPPORTED_BUCKET_PROVIDERS`, optional `BUCKET_ENDPOINT`, `BUCKET_FORCE_PATH_STYLE`, `BUCKET_UPLOAD_PUBLIC_ACL`.
- Renamed K8s secret to `podverse-workers-storage-bucket-opaque`; new script `create_workers_storage_bucket_secret.sh`; docs `BUCKET-PROVIDERS.md`; removed `DIGITAL-OCEAN-SETUP.md`.
- Removed package `packages/external-services-digital-ocean`.

#### Files Created/Modified

- `.llm/plans/active/multi-provider-image-bucket/` (plan set: `00-SUMMARY.md`, `00-EXECUTION-ORDER.md`, `COPY-PASTA.md`, `01`–`04` phase files)
- `packages/external-services-object-storage/` (new package)
- `packages/external-services-digital-ocean/` (removed)
- `apps/workers/src/types/imageStorage.ts`, `apps/workers/src/config/index.ts`, `apps/workers/src/lib/startup/validation.ts`, `apps/workers/src/index.ts`, `apps/workers/src/commands/imageShrink/cleanupOrphans.ts`, `apps/workers/src/commands/imageShrink/batch.ts`
- `apps/workers/package.json`, `apps/workers/Dockerfile`
- `package.json`, `package-lock.json`
- `infra/k8s/base/workers/image-shrink-consumer.deployment.yaml`, `infra/k8s/base/cron/worker-image-shrink-*.cronjob.yaml` (3 files)
- `infra/k8s/base/workers/source/workers.env`
- `infra/k8s/scripts/secret-generators/create_workers_storage_bucket_secret.sh`, `create_all_secrets_auto_gen.sh`, `INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`
- `infra/k8s/INFRA-K8S.md`
- `docs/image-shrinking/BUCKET-PROVIDERS.md`, `SERVICE.md`, `TESTING.md`, `ARCHITECTURE/01-FLOW.md`, `ARCHITECTURE/03-DELETION-ORPHANS.md`
- `docs/image-shrinking/DIGITAL-OCEAN-SETUP.md` (deleted)
- `apps/workers/.env.example`, `apps/workers/ENV.md`, `dev/env-overrides/local/storage.env.example`
