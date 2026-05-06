# image-shrink-max-source-bytes-env-example

**Started:** 2026-05-06  
**Author:** Session  
**Context:** Align `IMAGE_SHRINK_MAX_SOURCE_BYTES` in `.env.example` and K8s with other image-shrink defaults.

### Session 1 - 2026-05-06

#### Prompt (Developer)

@.env.example (84-92) why does IMAGE_SHRINK_MAX_SOURCE_BYTES not have a default value but everything else does? we want to give this a default value just like the others. we also don't need a comment in the code explaining IMAGE_SHRINK_MAX_SOURCE_BYTES

#### Key Decisions

- Set `IMAGE_SHRINK_MAX_SOURCE_BYTES="20971520"` in `apps/workers/.env.example` (matches `DEFAULT_IMAGE_SHRINK_MAX_SOURCE_BYTES` / 20 MiB).
- Set `IMAGE_SHRINK_MAX_SOURCE_BYTES=20971520` in `infra/k8s/base/workers/source/workers.env` and removed redundant comment lines there and in `.env.example`.
- Removed JSDoc on `ImageShrinkConfig.maxSourceBytes` in `apps/workers/src/config/index.ts`.

#### Files Created/Modified

- apps/workers/.env.example
- apps/workers/src/config/index.ts
- infra/k8s/base/workers/source/workers.env
- .llm/history/active/image-shrink-max-source-bytes-env-example/image-shrink-max-source-bytes-env-example-part-01.md
