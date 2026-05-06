# Summary — Multi-Provider Image Bucket (Podverse)

## Objective

Generalize the image-shrink worker's object-storage integration so it supports DigitalOcean
Spaces, Garage, AWS S3, Backblaze B2, and any other S3-compatible backend (MinIO, Cloudflare
R2, Ceph, etc.) through a single code path, shared env vars, and per-provider overrides only
where providers genuinely differ.

## Current state (short)

- Uploads/downloads/deletes already go through `@podverse/external-services-digital-ocean`,
  which wraps [`s3mini`](https://github.com/good-lly/s3mini). `s3mini` is already tested
  against DigitalOcean, AWS S3, Backblaze B2, Cloudflare R2, MinIO, and Ceph.
- Env vars are already provider-neutral names (`BUCKET_ACCESS_KEY`, `BUCKET_SECRET_KEY`,
  `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_CDN_BASE_URL`) plus a `BUCKET_PROVIDER` discriminator.
- `ImageStorageService` at [apps/workers/src/types/imageStorage.ts](../../../../apps/workers/src/types/imageStorage.ts)
  is a provider-agnostic contract (upload + public URL).

## Current coupling (what this plan set removes)

- `BUCKET_PROVIDER` validation only accepts `"digitalocean"` in
  [apps/workers/src/config/index.ts](../../../../apps/workers/src/config/index.ts) and
  [apps/workers/src/lib/startup/validation.ts](../../../../apps/workers/src/lib/startup/validation.ts).
- Endpoint URL is hard-coded to DO Spaces inside
  [packages/external-services-digital-ocean/src/index.ts](../../../../packages/external-services-digital-ocean/src/index.ts).
- `uploadResizedImage` always sends `x-amz-acl: public-read`, which Garage ignores and
  Cloudflare R2 can reject; the ACL needs to be opt-in.
- [apps/workers/src/commands/imageShrink/cleanupOrphans.ts](../../../../apps/workers/src/commands/imageShrink/cleanupOrphans.ts)
  imports `DigitalOceanService` directly because the `ImageStorageService` interface lacks
  `listObjects` / `deleteImageByKey` / `objectExists`.
- Package name, K8s secret, and secret-generator script are DO-branded.

## In-scope providers

Built-in `BUCKET_PROVIDER` values, each with a known endpoint template and sensible defaults:

- `digitalocean` — virtual-hosted, `https://{bucket}.{region}.digitaloceanspaces.com`
- `aws-s3` — virtual-hosted, `https://{bucket}.s3.{region}.amazonaws.com`
- `backblaze-b2` — path-style, `https://s3.{region}.backblazeb2.com`
- `garage` — path-style, user-supplied `BUCKET_ENDPOINT`
- `s3-compatible` — generic escape hatch (MinIO / Cloudflare R2 / Ceph); user supplies
  `BUCKET_ENDPOINT` and optionally `BUCKET_FORCE_PATH_STYLE`

## Env-var contract

Shared across every provider:

- `BUCKET_PROVIDER` (expanded allowed values)
- `BUCKET_ACCESS_KEY`, `BUCKET_SECRET_KEY` (K8s secret)
- `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_CDN_BASE_URL` (ConfigMap)

Added, provider-sensitive (all optional except where noted):

- `BUCKET_ENDPOINT` — required for `garage` and `s3-compatible`; overrides default template
  for other providers when set.
- `BUCKET_FORCE_PATH_STYLE` — `true` / `false`; defaults derived from provider (true for
  garage / backblaze-b2 / s3-compatible; false for digitalocean / aws-s3).
- `BUCKET_UPLOAD_PUBLIC_ACL` — default `public-read` for DO/AWS/B2, empty for garage and
  `s3-compatible`. When empty, no `x-amz-acl` header is sent (Cloudflare R2 / Garage rely on
  bucket policies).

`BUCKET_CDN_BASE_URL` remains the single public-URL knob, covering DO CDN, Garage gateway,
Cloudflare in front of any bucket, or a raw S3 virtual-hosted URL.

## Planned outputs

- A generic `@podverse/external-services-object-storage` package built on `s3mini`, with a
  provider-aware endpoint + path-style + ACL strategy.
- An expanded `ImageStorageService` interface covering upload, list, delete, and exists so
  every caller (consumer + orphan cleanup) goes through the factory.
- Updated env/validation/config with one source of truth for supported providers.
- Renamed K8s secret (`podverse-workers-storage-bucket-opaque`) and generator script, with an
  alpha-environment migration runbook.
- Multi-provider setup doc (`BUCKET-PROVIDERS.md`) replacing the DO-only guide, updated
  `SERVICE.md`, and updated env-example files.

## Plan files

1. [01-interface-and-package.md](./01-interface-and-package.md)
2. [02-config-validation-and-factory.md](./02-config-validation-and-factory.md)
3. [03-k8s-manifests-and-secrets.md](./03-k8s-manifests-and-secrets.md)
4. [04-docs-and-env-templates.md](./04-docs-and-env-templates.md)

See [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) for the phase order and rationale, and
[COPY-PASTA.md](./COPY-PASTA.md) for the execution prompts.

## LLM history

Update `.llm/history/active/multi-provider-image-bucket/multi-provider-image-bucket-part-01.md`
in every session that modifies files, per the `llm-history-tracking` rule.
