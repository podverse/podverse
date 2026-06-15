# 03 — Clip-list builder option

## Goal

Podcast list embeds can list clips (`type=clips`) with sort Recent or Popularity (`sort=top` + `range`).

## Tasks

1. Extend `EmbedBuilderQueryParams` with `listContentType` (`episodes` | `clips`) and wire `listSort` for clips.
2. Update parse/build URL helpers and `buildEmbedUrl.ts` to emit `type` and `range`.
3. Add builder UI in `EmbedBuilderPanel.tsx` for podcast list layouts.
4. i18n keys in `en-US.json`.
5. Unit tests + `embed-share-builder.spec.ts` E2E.

## Verification

```bash
npm run test -w apps/web -- src/lib/embed/__tests__/buildEmbedUrl.test.ts src/lib/embed/__tests__/parseEmbedBuilderQueryParams.test.ts
make e2e_test_web_report_spec SPEC=e2e/embed-share-builder.spec.ts
```
