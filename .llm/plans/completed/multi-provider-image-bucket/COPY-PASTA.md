# COPY-PASTA prompts — Multi-Provider Image Bucket (Podverse)

Use these prompts one at a time in order. After each prompt completes, update the LLM
history file at
`.llm/history/active/multi-provider-image-bucket/multi-provider-image-bucket-part-01.md`
per the `llm-history-tracking` rule.

## Prompt 1 — Interface and generic storage package

Execute `.llm/plans/active/multi-provider-image-bucket/01-interface-and-package.md`
exactly as written. Rename the package, keep the `s3mini` dependency, expand the
`ImageStorageService` interface, and update the Dockerfile and workspace references.
Do not change config, validation, K8s, or docs in this phase — those are separate.

## Prompt 2 — Config, validation, and factory wiring

Execute `.llm/plans/active/multi-provider-image-bucket/02-config-validation-and-factory.md`
exactly as written. Expand `BUCKET_PROVIDER` to the full supported list, add the new
optional env vars with provider-aware defaults, wire the new `ObjectStorageService` from
`apps/workers/src/index.ts`, and switch `cleanupOrphans.ts` to the factory. Do not rename
K8s resources yet.

## Prompt 3 — K8s manifests and secret management

Execute `.llm/plans/active/multi-provider-image-bucket/03-k8s-manifests-and-secrets.md`
exactly as written. Rename the K8s secret, rename the secret-generator script, update
every `envFrom`, add `BUCKET_ENDPOINT` to the workers ConfigMap source, update the
auto-gen manifest list, and include the alpha-environment migration runbook snippet.

## Prompt 4 — Docs and env templates

Execute `.llm/plans/active/multi-provider-image-bucket/04-docs-and-env-templates.md`
exactly as written. Replace `DIGITAL-OCEAN-SETUP.md` with `BUCKET-PROVIDERS.md`
(per-provider sections), update `SERVICE.md`, `apps/workers/.env.example`,
`apps/workers/ENV.md`, `dev/env-overrides/local/storage.env.example`, and
`infra/config/env-templates/workers.env.example` to match the finished shape.
