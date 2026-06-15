# 06 — Tests and docs

## Unit tests

- Catalog ordering (single demo order).
- `getEmbedLayoutType('episode-chapters')`.
- `mapItemChaptersToEmbedListRows` (rows seek within parent episode; asc/desc).
- `resolveEmbedListUrlOptionsFromBuilderParams` per content type (episodes/tracks/clips/chapters).
- `buildEmbedUrl` for the new types/sorts.

## E2E (apps/web)

- Demo page section order + new list demos render content.
- Builder content/sort selection produces correct iframe URLs.
- Episode-chapters list playback (row click seeks within episode).

## Docs

- Update `docs/features/EMBED-PLAYER.md` routes/query-params/builder sections for `episode-chapters`, the new list content types, and the new sort options.

## Verification

```bash
npm run test -w apps/web -- src/lib/embed/__tests__
make e2e_test_report_scoped WEB_SPEC=e2e/embed.spec.ts,e2e/embed-builder.spec.ts,e2e/embed-video-player.spec.ts
```
