# do-spaces-public-access

Started: 2026-05-06  
Author: Cursor Agent  
Context: Implement plan for DigitalOcean Spaces AccessDenied (curl verify, docs, env template fix).

### Session 1 - 2026-05-06

#### Prompt (Developer)

DigitalOcean Spaces: why you see `AccessDenied` and what to fix

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- `curl -sI` on the sample CDN URL returned **HTTP/2 403** (private object).
- Root `AccessDenied` vs object 403 documented in `BUCKET-PROVIDERS.md`; added bucket policy example
  and `BUCKET_UPLOAD_PUBLIC_ACL` unset-vs-empty pitfall.
- Removed `BUCKET_UPLOAD_PUBLIC_ACL=` from K8s workers env stub, `apps/workers/.env.example`, and
  `dev/env-overrides/local/storage.env.example` so deployments do not force empty ACL (which omits
  `public-read` on DigitalOcean).

#### Files Created/Modified

- docs/image-shrinking/BUCKET-PROVIDERS.md
- docs/image-shrinking/SERVICE.md
- apps/workers/ENV.md
- apps/workers/.env.example
- apps/workers/src/lib/startup/validation.ts
- dev/env-overrides/local/storage.env.example
- infra/k8s/base/workers/source/workers.env

### Session 2 - 2026-05-06

#### Prompt (Developer)

Remove `BUCKET_UPLOAD_PUBLIC_ACL` (provider-only public uploads)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed `BUCKET_UPLOAD_PUBLIC_ACL` entirely; upload ACL is **only** `defaultUploadPublicAcl(provider)`
  (`public-read` for digitalocean, aws-s3, backblaze-b2; omit header for garage, s3-compatible).
- Dropped optional startup validation and all docs/env references for the removed variable.

#### Files Created/Modified

- apps/workers/src/config/index.ts
- apps/workers/src/lib/startup/validation.ts
- docs/image-shrinking/BUCKET-PROVIDERS.md
- docs/image-shrinking/SERVICE.md
- apps/workers/ENV.md
- apps/workers/.env.example
- dev/env-overrides/local/storage.env.example
- infra/k8s/base/workers/source/workers.env
