# 01 — Interface and Generic Storage Package

## Scope

- Rename the DO-branded package to a generic S3-compatible package.
- Make endpoint construction, path-style addressing, and upload ACL provider-aware.
- Expand `ImageStorageService` so every caller (upload and cleanup) can go through the
  factory instead of importing a concrete implementation.

## Steps

1. Rename the package directory and name:
   - `packages/external-services-digital-ocean/` → `packages/external-services-object-storage/`
   - `package.json` name: `@podverse/external-services-object-storage`
   - Keep `"s3mini"` dependency and existing `version` bump policy.
2. Rename the service and types inside `src/index.ts`:
   - `DigitalOceanService` → `ObjectStorageService`
   - `DigitalOceanServiceParams` → `ObjectStorageServiceParams`
   - All `DigitalOcean*` request/response types → `ObjectStorage*`.
3. Replace `endpointForBucket(bucket, region, customEndpoint?)` with a provider-aware
   builder that accepts `{ provider, region, bucket, endpoint?, forcePathStyle }` and
   returns both the request endpoint URL and the path-style flag. Internal templates:
   - `digitalocean` (virtual-hosted): `https://{bucket}.{region}.digitaloceanspaces.com`
   - `aws-s3` (virtual-hosted): `https://{bucket}.s3.{region}.amazonaws.com`
   - `backblaze-b2` (path-style): `https://s3.{region}.backblazeb2.com`
   - `garage` (path-style): use the caller-supplied `endpoint` as-is
   - `s3-compatible` (path-style by default): use `endpoint` as-is; honor `forcePathStyle`
4. Add constructor params `provider`, `forcePathStyle: boolean`, `uploadPublicAcl?: string`
   to `ObjectStorageService`. Pass `forcePathStyle` through to `S3mini` when supported;
   otherwise construct the virtual-hosted or path-style endpoint URL directly (per
   `s3mini` docs at the version pinned in `package.json`).
5. In `uploadResizedImage`:
   - Only add `x-amz-acl` when `uploadPublicAcl` is non-empty.
   - Keep the existing `Cache-Control` behavior.
6. Expand the `ImageStorageService` interface at
   [apps/workers/src/types/imageStorage.ts](../../../../apps/workers/src/types/imageStorage.ts)
   so it matches the four operations already in the concrete class:
   - `uploadResizedImage`
   - `getPublicUrl`
   - `listObjects`
   - `deleteImageByKey`
   - `objectExists`
7. Update `apps/workers/Dockerfile` COPY paths that reference
   `packages/external-services-digital-ocean` to the new
   `packages/external-services-object-storage` directory.
8. Update workspace references:
   - `apps/workers/package.json` dependency name
   - `apps/workers/src/index.ts` dynamic import
   - `apps/workers/src/commands/imageShrink/cleanupOrphans.ts` import
   - Root `package.json` workspaces (if the pattern is explicit rather than glob)
   - `package-lock.json` (run `npm install` from repo root)

## Key files to touch

- `packages/external-services-digital-ocean/` (rename directory)
- `packages/external-services-object-storage/src/index.ts` (renamed service + endpoints)
- `packages/external-services-object-storage/package.json` (name + version)
- [apps/workers/src/types/imageStorage.ts](../../../../apps/workers/src/types/imageStorage.ts)
- [apps/workers/src/index.ts](../../../../apps/workers/src/index.ts)
- [apps/workers/src/commands/imageShrink/cleanupOrphans.ts](../../../../apps/workers/src/commands/imageShrink/cleanupOrphans.ts)
- [apps/workers/Dockerfile](../../../../apps/workers/Dockerfile)
- [apps/workers/package.json](../../../../apps/workers/package.json)
- Root `package.json` and `package-lock.json`

## Tests

- Add unit tests in the renamed package covering:
  - Endpoint construction for every provider (virtual-hosted vs path-style output).
  - `uploadResizedImage` includes `x-amz-acl` only when `uploadPublicAcl` is non-empty.
  - `deleteImageByKey`, `objectExists`, and `listObjects` still round-trip `S3mini`
    responses the same way the DO service did (use the existing behavior as a baseline;
    no new mocking framework).

## Verification

- `npm run build:packages` succeeds from repo root.
- `npm run build -w apps/workers` succeeds.
- `npm run lint` passes with no warnings.
- `git grep -E "external-services-digital-ocean|DigitalOceanService"` returns zero hits
  in source files (lock file noise acceptable until the next install).
- `ImageStorageService` no longer needs any callers to widen or narrow types via `as`.

## Out of scope for this phase

- Config/validation/factory wiring — covered in
  [02-config-validation-and-factory.md](./02-config-validation-and-factory.md).
- K8s secret/script rename — covered in
  [03-k8s-manifests-and-secrets.md](./03-k8s-manifests-and-secrets.md).
- Docs and env templates — covered in
  [04-docs-and-env-templates.md](./04-docs-and-env-templates.md).
