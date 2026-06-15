# 05 — Builder: list content types and sorting

Extend `apps/web/src/components/embed/EmbedBuilderPanel.tsx` and supporting lib so the user picks the appropriate list type for the source resource and a sort.

## Tasks

1. Extend `EMBED_BUILDER_LIST_CONTENT_TYPES` in `apps/web/src/lib/embed/embedBuilderTypes.ts` to `['episodes', 'clips', 'tracks', 'chapters']`; broaden `listSort` to a per-content-type set.
2. Resolve "appropriate" content options from the source context (drive the content selector from this):
   - podcast channel -> episodes or clips
   - music/album channel -> tracks
   - episode/item -> single or chapters
3. Generalize `apps/web/src/lib/embed/resolveEmbedListUrlOptionsFromBuilderParams.ts` (currently clips-only) to emit `type`/`sort`/`range` for:
   - episodes: recent / oldest / top (+range when top)
   - tracks: forward / backward / top (+range)
   - clips: recent / top (+range when top) — already
   - chapters: asc / desc (client-side; no API sort)
   then through `buildEmbedUrl`.
4. Add the sort selector UI for each list content type in the builder panel, with `range` shown when sort is `top`.

## Underlying API sort support (reference)

- Episodes by podcast (`reqItemGetManyByChannel`): recent/oldest/top + range.
- Tracks by album (`reqItemGetManyByChannelBySeason`): forward/backward/top + range.
- Clips by podcast (`reqClipGetManyByChannelPublic`): recent/oldest/top + range.
- Chapters by item: fixed `start_time ASC`; asc/desc handled client-side.

## Verification

```bash
npm run test -w apps/web -- src/lib/embed/__tests__
make e2e_test_web_report_spec SPEC=e2e/embed-builder.spec.ts
```
