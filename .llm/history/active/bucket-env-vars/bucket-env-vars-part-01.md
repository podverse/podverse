# Bucket env vars

**Started**: 2026-02-17  
**Context**: Rename image shrink bucket env vars and validation gating

---

### Session 1 - 2026-02-17

#### Prompt (Developer)

@.env (53-58) these two should be made generic, renamed to BUCKET_ACCESS_KEY and BUCKET_SECRET_KEY

all files and validation files should be updated. the renamed variables should be moved under image shrink (storage) comment section. a BUCKET_PROVIDER env var should be added and the only acceptable value should be "digitalocean" or empty. if a provider is defined, then the other related env vars are required. if a provider is not defined, then it should follow the path of no image bucket shrink functionality supported

#### Key Decisions

- Gate image shrink enablement on `BUCKET_PROVIDER` being set to `digitalocean`.
- Rename DigitalOcean access/secret vars to generic bucket keys under Image Shrink (storage).
- Use provider-agnostic config naming for bucket credentials.

#### Files Modified

- `apps/workers/.env`
- `apps/workers/.env.example`
- `apps/workers/src/config/index.ts`
- `apps/workers/src/index.ts`
- `apps/workers/src/commands/imageShrink/cleanupOrphans.ts`
- `apps/workers/src/lib/startup/validation.ts`
- `apps/workers/ENV.md`
- `infra/config/local/workers.env`
- `infra/k8s/base/workers/configmap.yaml`
- `infra/k8s/scripts/create_workers_digital_ocean_secret.sh`
- `docs/image-shrinking/SERVICE.md`
- `docs/image-shrinking/TESTING.md`
- `docs/image-shrinking/DIGITAL-OCEAN-SETUP.md`
