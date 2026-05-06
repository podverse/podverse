# 04 — Docs and Env Templates

## Scope

- Replace the DO-only setup doc with a multi-provider guide.
- Refresh the image-shrink service doc, env-example files, and env-template reference so
  every reader sees the finished shape.

## Steps

1. Create `docs/image-shrinking/BUCKET-PROVIDERS.md` with the following structure (keep
   the file under 300 lines; link out for long step-by-step provider sign-up flows
   instead of duplicating them):
   - Short intro: what `BUCKET_PROVIDER` selects and how the shared env vars relate.
   - Shared env-var table (`BUCKET_PROVIDER`, `BUCKET_ACCESS_KEY`, `BUCKET_SECRET_KEY`,
     `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_CDN_BASE_URL`).
   - Provider-sensitive env-var table (`BUCKET_ENDPOINT`, `BUCKET_FORCE_PATH_STYLE`,
     `BUCKET_UPLOAD_PUBLIC_ACL`) with "when to set" column.
   - Per-provider subsections:
     - **DigitalOcean Spaces** — keep the existing Spaces + CDN + access key flow.
     - **Garage** — path-style, user-supplied endpoint, no ACL header, public URL via
       reverse proxy; link to Garage docs.
     - **AWS S3** — virtual-hosted default, standard access/secret keys, CloudFront or
       public bucket for `BUCKET_CDN_BASE_URL`.
     - **Backblaze B2** — S3 API keys (not Application Keys UI), path-style, region slug,
       public bucket requirement.
     - **Generic S3-compatible** (MinIO / Cloudflare R2 / Ceph / self-hosted) — required
       `BUCKET_ENDPOINT`, path-style default, note that R2 rejects `x-amz-acl`
       (so `BUCKET_UPLOAD_PUBLIC_ACL=`), public URL via Workers/CDN.
2. Delete `docs/image-shrinking/DIGITAL-OCEAN-SETUP.md` (fully replaced by the new
   `BUCKET-PROVIDERS.md`). Preserve the "verify the space is writable" step as a
   generic "verify uploads" section at the end of `BUCKET-PROVIDERS.md`.
3. Update [docs/image-shrinking/SERVICE.md](../../../../docs/image-shrinking/SERVICE.md):
   - In "Required Environment Variables → Image Shrink (storage)", replace the list with
     the finished env-var set and link to `BUCKET-PROVIDERS.md`.
   - In "Kubernetes Wiring → Secret", reference the renamed secret
     (`podverse-workers-storage-bucket-opaque`) and the renamed generator script.
   - In "Cleanup Behavior Details → Orphan Cleanup Criteria", replace the hard-coded
     "lists objects directly from DigitalOcean Spaces" sentence with "lists objects
     directly from the configured bucket provider".
4. Update [apps/workers/.env.example](../../../../apps/workers/.env.example):
   - Expand the `BUCKET_PROVIDER` comment to list supported values and link to
     `docs/image-shrinking/BUCKET-PROVIDERS.md`.
   - Add the three new optional vars (`BUCKET_ENDPOINT`, `BUCKET_FORCE_PATH_STYLE`,
     `BUCKET_UPLOAD_PUBLIC_ACL`) under the `##### Image Shrink (storage) #####` section,
     each with its own comment line stating when to set it.
   - Follow the env-file-formatting rule: non-empty defaults in double quotes; empty
     values without quotes.
5. Update `apps/workers/ENV.md` to mirror the `.env.example` structure for the
   `BUCKET_*` group.
6. Update [dev/env-overrides/local/storage.env.example](../../../../dev/env-overrides/local/storage.env.example):
   - Add `BUCKET_ENDPOINT=`, `BUCKET_FORCE_PATH_STYLE=`, `BUCKET_UPLOAD_PUBLIC_ACL=`.
   - Add comments matching the `.env.example` when-to-set guidance.
7. Update `infra/config/env-templates/workers.env.example` if it diverges from
   `apps/workers/.env.example`. In this repo it currently points at the app template; if
   the pointer is still accurate, a one-line note is sufficient.

## Key files to touch

- `docs/image-shrinking/BUCKET-PROVIDERS.md` (new)
- `docs/image-shrinking/DIGITAL-OCEAN-SETUP.md` (delete)
- [docs/image-shrinking/SERVICE.md](../../../../docs/image-shrinking/SERVICE.md)
- [apps/workers/.env.example](../../../../apps/workers/.env.example)
- `apps/workers/ENV.md`
- [dev/env-overrides/local/storage.env.example](../../../../dev/env-overrides/local/storage.env.example)
- [infra/config/env-templates/workers.env.example](../../../../infra/config/env-templates/workers.env.example)

## Verification

- `git grep -nE "DIGITAL-OCEAN-SETUP|podverse-workers-digital-ocean-opaque" docs/` returns
  zero hits.
- `git grep -nE "BUCKET_PROVIDER" docs/ apps/workers/.env.example apps/workers/ENV.md
  dev/env-overrides/` shows the new provider list everywhere.
- `npm run prettier:write` followed by `npm run lint:fix` reformats the new docs and env
  files without substantive diff noise.
- `BUCKET-PROVIDERS.md` stays under 300 lines per the repo plan/docs conventions; split
  per-provider sections into their own files only if it would exceed that limit.

## Out of scope for this phase

- Code rename / interface expansion — phase 01.
- Config / validation / factory — phase 02.
- K8s / secret rename — phase 03.
