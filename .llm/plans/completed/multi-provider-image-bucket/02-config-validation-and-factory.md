# 02 — Config, Validation, and Factory Wiring

## Scope

- Expand `BUCKET_PROVIDER` to the full supported-provider set.
- Add optional env vars for provider-sensitive behavior (endpoint override, path-style,
  upload ACL) with provider-aware defaults in one place.
- Wire the new `ObjectStorageService` from the app bootstrap.
- Switch `cleanupOrphans.ts` to the factory-returned `ImageStorageService`.

## Supported provider set

Exported from config as `SUPPORTED_BUCKET_PROVIDERS: ReadonlySet<string>`:

- `digitalocean`
- `aws-s3`
- `backblaze-b2`
- `garage`
- `s3-compatible`

This set is the single source of truth consumed by validation, the factory, and the docs.

## Steps

1. In [apps/workers/src/config/index.ts](../../../../apps/workers/src/config/index.ts):
   - Export `SUPPORTED_BUCKET_PROVIDERS` and a helper
     `getBucketProviderDefaults(provider)` that returns
     `{ forcePathStyle: boolean; defaultUploadPublicAcl: string }`.
   - Extend `BucketProviderConfig` with `provider`, `endpoint?`, `forcePathStyle`,
     `uploadPublicAcl` resolved from env + defaults. The raw env reads:
     - `BUCKET_PROVIDER`, `BUCKET_ACCESS_KEY`, `BUCKET_SECRET_KEY`, `BUCKET_REGION`
     - `BUCKET_ENDPOINT` (optional; required later in validation for garage/s3-compatible)
     - `BUCKET_FORCE_PATH_STYLE` (optional; `true` / `false`; when unset use provider default)
     - `BUCKET_UPLOAD_PUBLIC_ACL` (optional; empty string means "omit the header"; when
       unset use provider default)
   - Extend `IMAGE_SHRINK_REQUIRED_VARS` so it branches on provider when `BUCKET_ENDPOINT`
     becomes required (garage / s3-compatible).
   - `hasAnyImageShrinkEnvSet` stays as-is (keyed on `BUCKET_PROVIDER`).
   - Rewrite `isImageShrinkEnabled` to `SUPPORTED_BUCKET_PROVIDERS.has(provider)` plus the
     required-vars check.
2. In [apps/workers/src/lib/startup/validation.ts](../../../../apps/workers/src/lib/startup/validation.ts)
   `validateImageShrink`:
   - Replace the `bucketProvider === 'digitalocean'` check with
     `SUPPORTED_BUCKET_PROVIDERS.has(bucketProvider)`.
   - Error message: `Invalid value: "<provider>" (expected one of: digitalocean, aws-s3,
     backblaze-b2, garage, s3-compatible)`.
   - When provider is `garage` or `s3-compatible`, add
     `validateRequired('BUCKET_ENDPOINT', 'Image Shrink')`. Otherwise mark it optional.
   - Add `validateOptional('BUCKET_FORCE_PATH_STYLE', 'Image Shrink', 'Use Default
     (provider-specific)')` and enforce `true` / `false` / unset values.
   - Add `validateOptional('BUCKET_UPLOAD_PUBLIC_ACL', 'Image Shrink', 'Use Default
     (provider-specific; empty to omit x-amz-acl)')`.
3. In [apps/workers/src/index.ts](../../../../apps/workers/src/index.ts):
   - Replace the `DigitalOceanService` dynamic import with `ObjectStorageService` from
     `@podverse/external-services-object-storage`.
   - Construct the service once using the resolved config from step 1.
4. In [apps/workers/src/commands/imageShrink/cleanupOrphans.ts](../../../../apps/workers/src/commands/imageShrink/cleanupOrphans.ts):
   - Remove the direct `DigitalOceanService` import and its `new` call.
   - Use `getImageStorageService()` (now covering `listObjects`, `getPublicUrl`, and
     `deleteImageByKey`). All existing control flow stays the same.
5. Optional: factor bucket config resolution into a small helper (e.g.
   `resolveBucketRuntimeConfig`) so the bootstrap and any future callers stay in sync.

## Key files to touch

- [apps/workers/src/config/index.ts](../../../../apps/workers/src/config/index.ts)
- [apps/workers/src/lib/startup/validation.ts](../../../../apps/workers/src/lib/startup/validation.ts)
- [apps/workers/src/index.ts](../../../../apps/workers/src/index.ts)
- [apps/workers/src/commands/imageShrink/cleanupOrphans.ts](../../../../apps/workers/src/commands/imageShrink/cleanupOrphans.ts)

## Tests

- Unit test the validation branch for each provider value including:
  - Invalid provider → required-missing.
  - `garage` without `BUCKET_ENDPOINT` → required-missing.
  - `s3-compatible` without `BUCKET_ENDPOINT` → required-missing.
  - `digitalocean` keeps current behavior (no `BUCKET_ENDPOINT` required).
- Unit test `getBucketProviderDefaults` for every provider.
- Existing parse/parse-boolean helpers cover `BUCKET_FORCE_PATH_STYLE` and
  `BUCKET_UPLOAD_PUBLIC_ACL`; only add minimal branch tests if the helpers are new.

## Verification

- `npm run lint` passes with no warnings.
- `npm run build -w apps/workers` succeeds.
- Running `node apps/workers/dist/index.js imageShrinkRunConsumer` locally with
  `BUCKET_PROVIDER=digitalocean` and the existing env vars behaves exactly as before
  (no runtime regression).
- Running the same command with `BUCKET_PROVIDER=garage` and a minimal local Garage
  config starts (uploads/lists require an actual Garage instance to exercise end-to-end).

## Out of scope for this phase

- Dockerfile / workspace rename (already handled in phase 01).
- K8s manifest and secret rename — phase 03.
- Docs and env-example edits — phase 04.
