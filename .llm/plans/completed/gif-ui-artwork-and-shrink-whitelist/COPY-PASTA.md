# COPY-PASTA — GIF UI artwork and shrink whitelist

## Prompt — step 01 (helpers UI)

Implement `01-gif-hero-ui-and-media-player.md`: add shared hero default extensions including `gif` in `packages/helpers/src/lib/image.ts`, wire all hero-oriented APIs, add/update unit tests, remove any stray agent-log `fetch` blocks in `image.ts`. Run `npm run test:unit -w @podverse/helpers` and lint helpers.

## Prompt — step 02 (workers shrink)

Implement `02-shrink-static-only-whitelist.md`: shrink-eligible URL whitelist + early exit + Sharp metadata defense in `apps/workers/src/commands/imageShrink/batch.ts`; export or reuse helpers from `@podverse/helpers` where appropriate; unit tests; short docs under `docs/image-shrinking/`. Run `npm run test:unit -w apps/workers`.

## Completion

When both steps are done, move this directory from `.llm/plans/active/gif-ui-artwork-and-shrink-whitelist/` to `.llm/plans/completed/gif-ui-artwork-and-shrink-whitelist/` per plan lifecycle rules.
