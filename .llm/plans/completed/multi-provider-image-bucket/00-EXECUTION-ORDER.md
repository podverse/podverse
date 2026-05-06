# Execution order — Multi-Provider Image Bucket (Podverse)

## Phase order

1. [01-interface-and-package.md](./01-interface-and-package.md)
2. [02-config-validation-and-factory.md](./02-config-validation-and-factory.md)
3. [03-k8s-manifests-and-secrets.md](./03-k8s-manifests-and-secrets.md)
4. [04-docs-and-env-templates.md](./04-docs-and-env-templates.md)

## Why this order

- **Phase 01 first** because every other phase depends on the generic
  `@podverse/external-services-object-storage` package and the expanded
  `ImageStorageService` interface. Touching this first means subsequent phases import
  a stable surface.
- **Phase 02 next** because config + validation + factory wiring sit directly on top of
  the new package and lock the supported-provider list that docs and K8s must match.
- **Phase 03** (K8s + secrets) depends on the final supported-provider list and the new
  env-var names from phase 02, and produces a rename that must be coordinated with the
  alpha environment (new secret applied before the workload rolls).
- **Phase 04** (docs + env templates) goes last so README, `BUCKET-PROVIDERS.md`,
  `SERVICE.md`, `.env.example`, and override files describe the finished shape rather
  than the intermediate one.

## Coordination notes

- Phases 01 and 02 should ideally land together (or within the same PR series) because
  the rename of `@podverse/external-services-digital-ocean` leaves no intermediate
  green build if only one is merged.
- Phase 03 requires a pre-merge step in the alpha cluster: generate the new secret via
  the renamed script and apply it, then roll the manifests in the same GitOps push.
- Phase 04 is safe to land in a separate follow-up if needed because it is docs-only.
